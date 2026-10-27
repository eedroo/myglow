import type { DailyEntry } from '@prisma/client';
import type { DateISO } from '@/lib/dates';
import type { SectionKey } from '@/lib/guided/sections';

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
  /** F19: secções com pelo menos um campo desbloqueado; as outras não contam para o nível nem dão Glow. */
  applicable: { morning: boolean; body: boolean; night: boolean };
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
  /**
   * F19: secções desbloqueadas na jornada. Cada parte do dia conta só os campos disponíveis; sem nenhum fica não
   * aplicável. Sem isto, tudo conta (comportamento anterior).
   */
  available?: Set<SectionKey>;
}

export function computeDayProgress(date: DateISO, entry: ProgressEntry | null, opts: ProgressOptions = {}): DayProgress {
  const wellbeing = opts.wellbeing ?? true;
  const has = (k: SectionKey) => !opts.available || opts.available.has(k);
  const applicable = {
    morning: has('intention') || has('morningBanish') || has('morningRitual') || (wellbeing && has('wakeMood')),
    body: has('body'),
    night: has('nightBanish') || has('nightRitual') || has('gratitude') || (wellbeing && has('mood')) || has('reflection'),
  };
  if (!entry) {
    return { date, hasEntry: false, morning: false, body: false, bodyChecks: 0, night: false, applicable, level: 'empty' };
  }

  // Um campo bloqueado conta como feito (não se pede o que a pessoa ainda não vê); secção não aplicável = false.
  const ok = (k: SectionKey, done: boolean) => !has(k) || done;
  const morning =
    applicable.morning &&
    ok('intention', filled(entry.intention)) && ok('morningBanish', entry.morningBanishDone) && ok('morningRitual', entry.morningRitualDone) &&
    (!wellbeing || ok('wakeMood', entry.wakeMood !== null));
  const bodyChecks = [entry.stretchDone, entry.workoutDone, entry.waterDone].filter(Boolean).length;
  const body = applicable.body && bodyChecks === 3;
  const night =
    applicable.night &&
    ok('nightBanish', entry.nightBanishDone) && ok('nightRitual', entry.nightRitualDone) && ok('gratitude', filled(entry.gratitude)) &&
    (!wellbeing || ok('mood', entry.mood !== null)) && ok('reflection', filled(entry.reflection));

  const touched =
    [entry.intention, entry.morningBanishName, entry.wakeNote, entry.nightBanishName, entry.gratitude, entry.reflection, entry.summary].some(filled) ||
    [entry.morningBanishDone, entry.morningRitualDone, entry.sleepGoalMet, entry.nightBanishDone, entry.nightRitualDone].some(Boolean) ||
    bodyChecks > 0 ||
    entry.wakeMood !== null ||
    entry.mood !== null;

  const complete = isDayComplete({ morning, body, night, applicable });
  const level: DayLevel = complete ? 'complete' : touched ? 'partial' : 'empty';
  return { date, hasEntry: true, morning, body, bodyChecks, night, applicable, level };
}

/** F19: dia completo = todas as partes aplicáveis completas (e pelo menos uma aplicável). */
export function isDayComplete(p: Pick<DayProgress, 'morning' | 'body' | 'night' | 'applicable'>): boolean {
  const parts = (['morning', 'body', 'night'] as const).filter((k) => p.applicable[k]);
  return parts.length > 0 && parts.every((k) => p[k]);
}
