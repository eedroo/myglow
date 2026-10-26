/**
 * Imagens da free-exercise-db → WebP 640 px → Vercel Blob em `exercises/<id>/<n>.webp` (F16).
 * Corre à mão (ou pelo workflow `fitness-library`), nunca no build. Escreve `content/exercises/images.json`
 * ({ id: url[] }) a cada 25 exercícios; os ids que já lá estão são saltados (idempotente).
 *
 * Precisa de BLOB_READ_WRITE_TOKEN.   npx tsx scripts/fitness/import-images.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { put } from '@vercel/blob';

const ROOT = path.join(process.cwd(), 'content', 'exercises');
const RAW = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const WIDTH = 640;
const CONCURRENCY = 6;

interface Src { id: string; images: string[] }

async function one(item: Src, token: string): Promise<string[]> {
  const urls: string[] = [];
  for (const [n, rel] of item.images.entries()) {
    const res = await fetch(RAW + rel);
    if (!res.ok) throw new Error(`${item.id}: ${res.status} em ${rel}`);
    const webp = await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    const blob = await put(`exercises/${item.id}/${n}.webp`, webp, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
      token,
    });
    urls.push(blob.url);
  }
  return urls;
}

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('Falta BLOB_READ_WRITE_TOKEN.');
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'source', 'exercises.json'), 'utf8')) as Src[];
  const file = path.join(ROOT, 'images.json');
  const out: Record<string, string[]> = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const todo = source.filter((s) => s.images.length && !out[s.id]);
  console.log(`[images] ${todo.length} exercícios por importar`);
  const save = () => fs.writeFileSync(file, `${JSON.stringify(Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]])), null, 2)}\n`);

  let done = 0;
  let failed = 0;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const chunk = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map((s) => one(s, token)));
    results.forEach((r, k) => {
      if (r.status === 'fulfilled') out[chunk[k]!.id] = r.value;
      else {
        failed++;
        console.warn(`[images] falhou: ${r.reason instanceof Error ? r.reason.message : r.reason}`);
      }
    });
    done += chunk.length;
    if (done % 24 === 0 || done === todo.length) {
      save();
      console.log(`[images] ${done}/${todo.length}`);
    }
  }
  save();
  if (failed) console.warn(`[images] ${failed} falharam: correr de novo para tentar só esses.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
