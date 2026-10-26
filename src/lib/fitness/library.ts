import type { ExerciseMeasure, Prisma } from '@prisma/client';
import type { AppLocale } from '@/i18n/locales';
import type { ExerciseView } from './types';

/**
 * Biblioteca de exercícios (F16): free-exercise-db (Unlicense) + exercícios próprios. Funções puras usadas
 * pelo seed, pelas queries e pela pesquisa.
 */
export interface FreeExerciseDbItem {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

export interface I18nItem {
  name: string;
  instructions: string[];
}

export type ExerciseNames = Partial<Record<'en' | AppLocale, string>>;

const DURATION_NAME = /\b(plank|hold|prancha|isometric|wall sit)\b/i;

/** Como se regista: tempo (alongamentos, cardio, pranchas), só reps (peso corporal) ou kg + reps. */
export function inferMeasure(src: { category: string; equipment: string | null; name: string }): ExerciseMeasure {
  if (src.category === 'stretching' || src.category === 'cardio' || DURATION_NAME.test(src.name)) return 'DURATION';
  if (src.equipment === 'body only') return 'REPS';
  return 'REPS_WEIGHT';
}

export function toExerciseRow(
  src: FreeExerciseDbItem,
  images: string[],
  i18n: { ptPT?: I18nItem; ptBR?: I18nItem },
): Prisma.ExerciseCreateInput {
  const names: ExerciseNames = { en: src.name };
  if (i18n.ptPT?.name) names['pt-PT'] = i18n.ptPT.name;
  if (i18n.ptBR?.name) names['pt-BR'] = i18n.ptBR.name;
  const instructions: Record<string, string[]> = { en: src.instructions };
  if (i18n.ptPT?.instructions.length) instructions['pt-PT'] = i18n.ptPT.instructions;
  if (i18n.ptBR?.instructions.length) instructions['pt-BR'] = i18n.ptBR.instructions;
  return {
    id: src.id,
    source: 'LIBRARY',
    names,
    category: src.category,
    measure: inferMeasure(src),
    primaryMuscles: src.primaryMuscles,
    secondaryMuscles: src.secondaryMuscles,
    equipment: src.equipment ?? null,
    level: src.level ?? null,
    instructions,
    images,
  };
}

const FALLBACK: Record<AppLocale, ('en' | AppLocale)[]> = {
  'pt-PT': ['pt-PT', 'pt-BR', 'en'],
  'pt-BR': ['pt-BR', 'pt-PT', 'en'],
  en: ['en', 'pt-BR', 'pt-PT'],
};

/** Nome na língua da pessoa: pt-PT → pt-BR → en (e vice-versa). */
export function exerciseName(names: ExerciseNames | Record<string, string>, locale: AppLocale): string {
  const n = names as ExerciseNames;
  for (const k of FALLBACK[locale]) if (n[k]) return n[k]!;
  return Object.values(names).find(Boolean) ?? '';
}

/** Instruções na língua da pessoa, com a mesma ordem de recurso. */
export function exerciseInstructions(instructions: Record<string, string[]> | null, locale: AppLocale): string[] {
  if (!instructions) return [];
  for (const k of FALLBACK[locale]) if (instructions[k]?.length) return instructions[k]!;
  return [];
}

/** Minúsculas, sem acentos, só letras e números. */
export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Pesquisa no nome do locale e no inglês (todas as palavras têm de aparecer), com filtros. */
export function searchExercises(
  list: ExerciseView[],
  query: string,
  filters: { muscle?: string; equipment?: string; category?: string } = {},
): ExerciseView[] {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  return list.filter((e) => {
    if (filters.muscle && !e.primaryMuscles.includes(filters.muscle) && !e.secondaryMuscles.includes(filters.muscle)) return false;
    if (filters.equipment && (e.equipment ?? 'none') !== filters.equipment) return false;
    if (filters.category && e.category !== filters.category) return false;
    if (!words.length) return true;
    const hay = `${normalizeSearch(e.name)} ${normalizeSearch(e.nameEn)}`;
    return words.every((w) => hay.includes(w));
  });
}
