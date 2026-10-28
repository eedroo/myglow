/**
 * Secções do diário e dos planners que o modo guiado pode pedir (F18). Puro.
 * Na Fase 19 (Jornada) `unlocked` passa a dizer o que a pessoa já desbloqueou; aqui é sempre tudo.
 */
export type SectionKey =
  | 'reading' | 'nightReading' | 'intention' | 'morningBanish' | 'morningRitual' | 'sleep' | 'wakeMood'
  | 'body' | 'dailyWeight' | 'nightBanish' | 'nightRitual' | 'gratitude' | 'mood' | 'reflection' | 'summary'
  | 'weekIntention' | 'weekProjects' | 'weekWeight' | 'weekReflection'
  | 'monthIntention' | 'monthProjects' | 'monthReflection'
  | 'yearWord' | 'yearIntention' | 'yearProjects' | 'yearReflection';

export interface SectionContext {
  hasWellbeingConsent: boolean;
  hasBodyPro: boolean;
  /** Fase 19; undefined = tudo desbloqueado. */
  unlocked?: Set<SectionKey>;
  /** A leitura do dia ficou para a noite (escolha do dia): o fecho do dia começa por ela. */
  readingAtNight?: boolean;
}

/** Dados de bem-estar (Fase 9): só com consentimento. */
const WELLBEING: SectionKey[] = ['sleep', 'wakeMood', 'mood', 'weekWeight', 'dailyWeight'];

export function isSectionAvailable(key: SectionKey, ctx: SectionContext): boolean {
  if (WELLBEING.includes(key) && !ctx.hasWellbeingConsent) return false;
  // Peso do dia no fim da manhã: só com o Foco no corpo (premium).
  if (key === 'dailyWeight' && !ctx.hasBodyPro) return false;
  if (key === 'nightReading' && !ctx.readingAtNight) return false;
  if (ctx.unlocked && !ctx.unlocked.has(key)) return false;
  return true;
}
