import type { DailyEntry } from '@prisma/client';
import type { DateISO } from '@/lib/dates';

/**
 * Progresso de um dia do diário — base da gamificação (Fase 5).
 * Sono e resumo não contam: não se penaliza dormir mal e o resumo é opcional.
 */
export type DayLevel = 'empty' | 'partial' | 'complete';

export interface DayProgress {
  date: DateISO;
  hasEntry: boolean;
  morning: boolean; // intenção + banimento matinal feito + ritual matinal + como acordei (sem consentimento de bem-estar: sem "como acordei")
  body: boolean; // alongamento + treino + água
  bodyChecks: number; // 0–3
  night: boolean; // banimento nocturno feito + ritual nocturno + gratidão + humor + reflexão (sem consentimento: sem humor)
  level: DayLevel;
}

export type ProgressEntry = Pick<
  DailyEntry,
  | 'intention' | 'morningBanishName' | 'morningBanishDone' | 'morningRitualDone' | 'sleepGoalMet'
  | 'wakeMood' | 'wakeNote' | 'stretchDone' | 'workoutDone' | 'waterDone'
  | 'nightBanishName' | 'nightBanishDone' | 'nightRitualDone' | 'gratitude' | 'mood' | 'reflection' | 'summary'
>;

/** Campos pedidos à DB para calcular o progresso. */
export const PROGRESS_SELECT = {
  intention: true, morningBanishName: true, morningBanishDone: true, morningRitualDone: true, sleepGoalMet: true,
  wakeMood: true, wakeNote: true, stretchDone: true, workoutDone: true, waterDone: true,
  nightBanishName: true, nightBanishDone: true, nightRitualDone: true, gratitude: true, mood: true,
  reflection: true, summary: true,
} as const satisfies Record<keyof ProgressEntry, true>;

const filled = (v: string | null | undefined) => typeof v === 'string' && v.trim() !== '';

export interface ProgressOptions {
  /**
   * F9: consentimento para dados de bem-estar. Sem ele, humor, "como acordei" e sono são ignorados
   * (a manhã passa a ser intenção + banimento + ritual; a noite deixa de pedir o humor).
   */
  wellbeing?: boolean;
}

export function computeDayProgress(date: DateISO, entry: ProgressEntry | null, opts: ProgressOptions = {}): DayProgress {
  if (!entry) {
    return { date, hasEntry: false, morning: false, body: false, bodyChecks: 0, night: false, level: 'empty' };
  }

  const wellbeing = opts.wellbeing ?? true;
  const morning =
    filled(entry.intention) && entry.morningBanishDone && entry.morningRitualDone && (!wellbeing || entry.wakeMood !== null);
  const bodyChecks = [entry.stretchDone, entry.workoutDone, entry.waterDone].filter(Boolean).length;
  const body = bodyChecks === 3;
  const night =
    entry.nightBanishDone && entry.nightRitualDone && filled(entry.gratitude) && (!wellbeing || entry.mood !== null) && filled(entry.reflection);

  const touched =
    [entry.intention, entry.morningBanishName, entry.wakeNote, entry.nightBanishName, entry.gratitude, entry.reflection, entry.summary].some(filled) ||
    [entry.morningBanishDone, entry.morningRitualDone, entry.sleepGoalMet, entry.nightBanishDone, entry.nightRitualDone].some(Boolean) ||
    bodyChecks > 0 ||
    entry.wakeMood !== null ||
    entry.mood !== null;

  const level: DayLevel = morning && body && night ? 'complete' : touched ? 'partial' : 'empty';
  return { date, hasEntry: true, morning, body, bodyChecks, night, level };
}
