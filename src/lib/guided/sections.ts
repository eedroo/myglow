/**
 * Secções do diário e dos planners que o modo guiado pode pedir (F18). Puro.
 * Na Fase 19 (Jornada) `unlocked` passa a dizer o que a pessoa já desbloqueou; aqui é sempre tudo.
 */
export type SectionKey =
  | 'reading' | 'intention' | 'morningBanish' | 'morningRitual' | 'sleep' | 'wakeMood'
  | 'body' | 'nightBanish' | 'nightRitual' | 'gratitude' | 'mood' | 'reflection' | 'summary'
  | 'weekIntention' | 'weekProjects' | 'weekWeight' | 'weekReflection'
  | 'monthIntention' | 'monthProjects' | 'monthReflection'
  | 'yearWord' | 'yearIntention' | 'yearProjects' | 'yearReflection';

export interface SectionContext {
  hasWellbeingConsent: boolean;
  hasBodyPro: boolean;
  /** Fase 19; undefined = tudo desbloqueado. */
  unlocked?: Set<SectionKey>;
}

/** Dados de bem-estar (Fase 9): só com consentimento. */
const WELLBEING: SectionKey[] = ['sleep', 'wakeMood', 'mood', 'weekWeight'];

export function isSectionAvailable(key: SectionKey, ctx: SectionContext): boolean {
  if (WELLBEING.includes(key) && !ctx.hasWellbeingConsent) return false;
  if (ctx.unlocked && !ctx.unlocked.has(key)) return false;
  return true;
}
