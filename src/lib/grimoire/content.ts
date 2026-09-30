import fs from 'node:fs';
import path from 'node:path';
import {
  catalogSchema, courseSchema, type CatalogEntry, type Course, type GrimoireLocale,
} from './schema';

/**
 * Conteúdo do Grimório: `content/grimoire/index.json` + `<slug>/<locale>.json`, validados com Zod.
 * Acrescentar um curso = ficheiros novos + uma linha no index. Só no servidor (lê do disco); cache em memória
 * (em desenvolvimento relê sempre, para editar o conteúdo sem reiniciar).
 */
export const CONTENT_ROOT = path.join(process.cwd(), 'content', 'grimoire');

const cache = new Map<string, unknown>();
const useCache = process.env.NODE_ENV !== 'development';

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function cached<T>(key: string, load: () => T): T {
  if (useCache && cache.has(key)) return cache.get(key) as T;
  const value = load();
  if (useCache) cache.set(key, value);
  return value;
}

export function getCatalog(root = CONTENT_ROOT): CatalogEntry[] {
  return cached(`catalog:${root}`, () =>
    [...catalogSchema.parse(readJson(path.join(root, 'index.json'))).courses].sort((a, b) => a.order - b.order),
  );
}

export function getCourse(slug: string, locale: GrimoireLocale, root = CONTENT_ROOT): Course | null {
  return cached(`course:${root}:${slug}:${locale}`, () => {
    const entry = getCatalog(root).find((c) => c.slug === slug);
    if (!entry || !entry.locales.includes(locale)) return null;
    const file = path.join(root, slug, `${locale}.json`);
    if (!fs.existsSync(file)) return null;
    return courseSchema.parse(readJson(file));
  });
}

/**
 * Língua do conteúdo: pt-BR → pt-BR; pt-PT → pt-PT se existir, senão pt-BR; en → en se existir, senão pt-BR
 * só se o utilizador escolheu ler em português; senão `null` ("coming soon in English").
 */
export function resolveContentLocale(
  userLocale: 'pt-PT' | 'pt-BR' | 'en',
  readInPortuguese: boolean,
  available: readonly GrimoireLocale[],
): GrimoireLocale | null {
  if (available.includes(userLocale)) return userLocale;
  if (userLocale === 'pt-PT') return available.includes('pt-BR') ? 'pt-BR' : null;
  if (userLocale === 'pt-BR') return available.includes('pt-PT') ? 'pt-PT' : null;
  if (!readInPortuguese) return null;
  return available.includes('pt-BR') ? 'pt-BR' : available.includes('pt-PT') ? 'pt-PT' : null;
}

function dupes(ids: string[]): string[] {
  return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
}

/** Valida todo o conteúdo; devolve a lista de erros (vazia = tudo certo). Usado por `content:check` e testes. */
export function checkContent(root = CONTENT_ROOT): string[] {
  const errors: string[] = [];
  let catalog: CatalogEntry[];
  try {
    catalog = catalogSchema.parse(readJson(path.join(root, 'index.json'))).courses;
  } catch (e) {
    return [`index.json: ${e instanceof Error ? e.message : String(e)}`];
  }
  for (const d of dupes(catalog.map((c) => c.slug))) errors.push(`index.json: slug repetido "${d}"`);
  for (const d of dupes(catalog.map((c) => String(c.order)))) errors.push(`index.json: order repetida ${d}`);

  for (const entry of catalog) {
    for (const locale of entry.locales) {
      const rel = `${entry.slug}/${locale}.json`;
      const file = path.join(root, rel);
      if (!fs.existsSync(file)) {
        errors.push(`${rel}: ficheiro em falta (listado em index.json)`);
        continue;
      }
      const parsed = courseSchema.safeParse(readJson(file));
      if (!parsed.success) {
        for (const i of parsed.error.issues) errors.push(`${rel}: ${i.path.join('.')}: ${i.message}`);
        continue;
      }
      const c = parsed.data;
      if (c.slug !== entry.slug) errors.push(`${rel}: slug "${c.slug}" ≠ "${entry.slug}"`);
      if (c.locale !== locale) errors.push(`${rel}: locale "${c.locale}" ≠ "${locale}"`);
      if (c.order !== entry.order || c.required !== entry.required) errors.push(`${rel}: order/required diferentes do index.json`);
      for (const d of dupes(c.lessons.map((l) => l.slug))) errors.push(`${rel}: lição repetida "${d}"`);
      for (const d of dupes(c.lessons.flatMap((l) => l.cards.map((k) => k.id)))) errors.push(`${rel}: card id repetido "${d}"`);
      for (const l of c.lessons) {
        for (const d of dupes(l.review.map((q) => q.id))) errors.push(`${rel}: ${l.slug}: pergunta de revisão repetida "${d}"`);
      }
      for (const d of dupes(c.quiz.map((q) => q.id))) errors.push(`${rel}: pergunta do quiz repetida "${d}"`);
    }
  }
  return errors;
}
