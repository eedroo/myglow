import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { exerciseName, inferMeasure, searchExercises, toExerciseRow, type FreeExerciseDbItem } from './library';
import type { ExerciseView } from './types';

const SOURCE = path.join(process.cwd(), 'content', 'exercises', 'source', 'exercises.json');
const items = JSON.parse(fs.readFileSync(SOURCE, 'utf8')) as FreeExerciseDbItem[];

const view = (id: string, name: string, nameEn: string, patch: Partial<ExerciseView> = {}): ExerciseView => ({
  id, source: 'LIBRARY', name, nameEn, category: 'strength', measure: 'REPS_WEIGHT',
  primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes'], equipment: 'barbell', thumb: null, ...patch,
});

describe('inferMeasure', () => {
  it('stretching e Plank → DURATION; body only → REPS; barbell → REPS_WEIGHT', () => {
    expect(inferMeasure({ category: 'stretching', equipment: null, name: 'Hamstring Stretch' })).toBe('DURATION');
    expect(inferMeasure({ category: 'strength', equipment: 'body only', name: 'Plank' })).toBe('DURATION');
    expect(inferMeasure({ category: 'strength', equipment: 'body only', name: 'Pushups' })).toBe('REPS');
    expect(inferMeasure({ category: 'strength', equipment: 'barbell', name: 'Barbell Squat' })).toBe('REPS_WEIGHT');
  });
});

describe('exerciseName', () => {
  const names = { en: 'Barbell Squat', 'pt-BR': 'Agachamento livre' };
  it('com recurso entre as línguas', () => {
    expect(exerciseName(names, 'pt-BR')).toBe('Agachamento livre');
    expect(exerciseName(names, 'pt-PT')).toBe('Agachamento livre');
    expect(exerciseName(names, 'en')).toBe('Barbell Squat');
    expect(exerciseName({ en: 'Plank' }, 'pt-PT')).toBe('Plank');
  });
});

describe('searchExercises', () => {
  const list = [
    view('Barbell_Squat', 'Agachamento com barra', 'Barbell Squat'),
    view('Pushups', 'Flexões', 'Pushups', { primaryMuscles: ['chest'], secondaryMuscles: ['triceps'], equipment: 'body only' }),
    view('Hamstring_Stretch', 'Alongamento dos posteriores', 'Hamstring Stretch', { category: 'stretching', primaryMuscles: ['hamstrings'], equipment: null }),
  ];
  it('pelo nome em português, sem acentos', () => {
    expect(searchExercises(list, 'agachamento').map((e) => e.id)).toEqual(['Barbell_Squat']);
    expect(searchExercises(list, 'FLEXOES').map((e) => e.id)).toEqual(['Pushups']);
  });
  it('pelo nome em inglês', () => {
    expect(searchExercises(list, 'squat').map((e) => e.id)).toEqual(['Barbell_Squat']);
  });
  it('filtros: músculo, equipamento (sem = none), categoria', () => {
    expect(searchExercises(list, '', { muscle: 'triceps' }).map((e) => e.id)).toEqual(['Pushups']);
    expect(searchExercises(list, '', { equipment: 'none' }).map((e) => e.id)).toEqual(['Hamstring_Stretch']);
    expect(searchExercises(list, '', { category: 'stretching' }).map((e) => e.id)).toEqual(['Hamstring_Stretch']);
  });
});

describe('importação', () => {
  it('toExerciseRow junta nomes, instruções e imagens', () => {
    const src = items.find((x) => x.id === 'Barbell_Squat')!;
    const row = toExerciseRow(src, ['https://blob/0.webp'], { ptPT: { name: 'Agachamento com barra', instructions: ['Desce.'] } });
    expect(row).toMatchObject({
      id: 'Barbell_Squat', source: 'LIBRARY', measure: 'REPS_WEIGHT', images: ['https://blob/0.webp'],
      names: { en: 'Barbell Squat', 'pt-PT': 'Agachamento com barra' },
      instructions: { en: src.instructions, 'pt-PT': ['Desce.'] },
    });
  });

  it('ids únicos', () => {
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it('todos os músculos, equipamentos e categorias têm etiqueta nas 3 línguas', () => {
    const muscles = new Set(items.flatMap((i) => [...i.primaryMuscles, ...i.secondaryMuscles]));
    const equipment = new Set(items.map((i) => i.equipment ?? 'none'));
    const categories = new Set(items.map((i) => i.category));
    for (const locale of ['pt-PT', 'pt-BR', 'en']) {
      const m = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'messages', `${locale}.json`), 'utf8')).fitness;
      for (const k of muscles) expect(m.muscles[k], `${locale} músculo ${k}`).toBeTruthy();
      for (const k of equipment) expect(m.equipment[k], `${locale} equipamento ${k}`).toBeTruthy();
      for (const k of categories) expect(m.categories[k], `${locale} categoria ${k}`).toBeTruthy();
    }
  });
});
