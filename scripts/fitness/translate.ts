/**
 * Traduz o nome e as instruções dos exercícios da free-exercise-db para pt-PT e pt-BR (F16).
 * Corre à mão (ou pelo workflow `fitness-library`), nunca no build. Escreve
 * `content/exercises/i18n/{pt-PT,pt-BR}.json` ({ id: { name, instructions[] } }) depois de cada lote, para
 * se poder interromper e continuar: os ids já traduzidos são saltados.
 *
 * Precisa de OPENAI_API_KEY e OPENAI_MODEL_RICH (e OPENAI_BASE_URL para o Gemini).
 *   npx tsx scripts/fitness/translate.ts            (as duas línguas)
 *   npx tsx scripts/fitness/translate.ts pt-PT      (só uma)
 */
import fs from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const ROOT = path.join(process.cwd(), 'content', 'exercises');
const BATCH = 25;
type Locale = 'pt-PT' | 'pt-BR';
interface Src { id: string; name: string; instructions: string[] }
type Out = Record<string, { name: string; instructions: string[] }>;

const GUIDE: Record<Locale, string> = {
  'pt-PT':
    'European Portuguese (Portugal, pre-1990 spelling such as "acção"), as people say it in a Portuguese gym. ' +
    'Examples: "Agachamento com barra", "Remada curvada com barra", "Supino plano com barra", "Elevações", "Gémeos".',
  'pt-BR':
    'Brazilian Portuguese, as people say it in a Brazilian gym (academia). ' +
    'Examples: "Agachamento livre", "Remada curvada", "Supino reto com barra", "Barra fixa", "Puxada alta", "Panturrilha".',
};

const schema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string(), instructions: z.array(z.string()) })),
});

function system(locale: Locale): string {
  return [
    `Translate gym exercise names and instructions from English to ${GUIDE[locale]}`,
    '- Use the common gym name in that country, not a literal translation.',
    '- Keep established English names when that is what people say at the gym (e.g. "Leg press", "Hip thrust", "Crossover").',
    '- Instructions: short sentences in the imperative, one item per input item, same order. No em dashes. No emojis.',
    '- Keep every id exactly as given. Return every item.',
  ].join('\n');
}

async function main() {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL_RICH;
  if (!key || !model) throw new Error('Falta OPENAI_API_KEY ou OPENAI_MODEL_RICH.');
  const client = new OpenAI({ apiKey: key, baseURL: process.env.OPENAI_BASE_URL || undefined, maxRetries: 5 });
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'source', 'exercises.json'), 'utf8')) as Src[];
  const locales = (process.argv.slice(2).filter((a) => a === 'pt-PT' || a === 'pt-BR') as Locale[]) || [];

  for (const locale of locales.length ? locales : (['pt-PT', 'pt-BR'] as Locale[])) {
    const file = path.join(ROOT, 'i18n', `${locale}.json`);
    const out: Out = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    const todo = source.filter((s) => !out[s.id]);
    console.log(`[translate] ${locale}: ${todo.length} por traduzir`);
    for (let i = 0; i < todo.length; i += BATCH) {
      const batch = todo.slice(i, i + BATCH).map((s) => ({ id: s.id, name: s.name, instructions: s.instructions }));
      const res = await client.chat.completions.parse({
        model,
        messages: [
          { role: 'system', content: system(locale) },
          { role: 'user', content: JSON.stringify({ items: batch }) },
        ],
        response_format: zodResponseFormat(schema, 'exercises'),
      });
      const parsed = res.choices[0]?.message.parsed;
      if (!parsed) throw new Error(`[translate] Resposta vazia no lote ${i / BATCH + 1}`);
      const wanted = new Map(batch.map((b) => [b.id, b]));
      for (const item of parsed.items) {
        const src = wanted.get(item.id);
        if (!src || !item.name.trim()) continue;
        const instructions = item.instructions.map((s) => s.replace(/\s*—\s*/g, ', ').trim()).filter(Boolean);
        out[item.id] = { name: item.name.trim(), instructions: instructions.length ? instructions : [] };
      }
      fs.writeFileSync(file, `${JSON.stringify(sortKeys(out), null, 2)}\n`);
      console.log(`[translate] ${locale}: ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
    }
  }
}

function sortKeys(o: Out): Out {
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]!]));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
