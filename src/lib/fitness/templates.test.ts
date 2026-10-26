import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import raw from '../../../content/fitness/templates.json';
import { FITNESS_TEMPLATES, templatesSchema } from './templates';

const library = new Set(
  (JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'exercises', 'source', 'exercises.json'), 'utf8')) as { id: string }[]).map(
    (e) => e.id,
  ),
);

describe('modelos de programa', () => {
  it('Zod passa e há os 4 modelos', () => {
    expect(templatesSchema.safeParse(raw).success).toBe(true);
    expect(FITNESS_TEMPLATES.map((t) => t.id)).toEqual(['ppl', 'fullbody', 'upperlower', 'stretch']);
  });

  it('todos os exerciseId existem na biblioteca', () => {
    for (const t of FITNESS_TEMPLATES) for (const w of t.workouts) for (const i of w.items) expect(library.has(i.exerciseId), i.exerciseId).toBe(true);
  });

  it('cada item tem reps ou segundos', () => {
    for (const t of FITNESS_TEMPLATES) for (const w of t.workouts) for (const i of w.items) expect(i.repsMin ?? i.sec, `${t.id}/${w.key}/${i.exerciseId}`).toBeDefined();
  });

  it('nomes nas 3 línguas', () => {
    for (const locale of ['pt-PT', 'pt-BR', 'en']) {
      const m = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'messages', `${locale}.json`), 'utf8')).fitness.templates;
      for (const t of FITNESS_TEMPLATES) {
        expect(m[t.id]?.name, `${locale} ${t.id}`).toBeTruthy();
        for (const w of t.workouts) expect(m[t.id]?.workouts?.[w.key], `${locale} ${t.id}/${w.key}`).toBeTruthy();
      }
    }
  });
});
