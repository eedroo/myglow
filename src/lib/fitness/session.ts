import type { ExerciseMeasure, ProgramKind } from '@prisma/client';
import type { LastPerformance, SetInput } from './types';

/**
 * Regras da sessão de treino (F16). Puras. Os tempos saem sempre de timestamps gravados (`startedAt`,
 * `restEndsAt`), nunca de contadores em memória: fechar a app e voltar mostra o valor certo.
 */

/** Descanso: item do treino → exercício → preferência. */
export function restFor(
  item: { restSec: number | null } | null,
  exercise: { defaultRestSec: number | null },
  prefs: { defaultRestSec: number },
): number {
  return item?.restSec ?? exercise.defaultRestSec ?? prefs.defaultRestSec;
}

export function restEndsAt(completedAt: Date, restSec: number): Date {
  return new Date(completedAt.getTime() + restSec * 1000);
}

/** Segundos de descanso que faltam (nunca negativo). */
export function remainingRest(restEndsAt: Date | null, now: Date): number {
  if (!restEndsAt) return 0;
  return Math.max(0, Math.ceil((restEndsAt.getTime() - now.getTime()) / 1000));
}

/** Segundos desde o início (até ao fim, se terminou). */
export function elapsed(startedAt: Date, now: Date, endedAt?: Date | null): number {
  const end = endedAt ?? now;
  return Math.max(0, Math.floor((end.getTime() - startedAt.getTime()) / 1000));
}

/** 3725 → "1:02:05"; 125 → "02:05" (cronómetros e durações). */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/**
 * Próxima série: a série com o mesmo número na última vez; senão a última feita nesta sessão; senão o alvo.
 */
export function prefillSet(i: {
  doneInSession: SetInput[];
  last: LastPerformance | null;
  target: { repsMin: number | null; sec: number | null };
}): Omit<SetInput, 'exerciseId'> {
  const clean = (s: { reps?: number | null; weightGrams?: number | null; durationSec?: number | null }) => {
    const out: Omit<SetInput, 'exerciseId'> = {};
    if (s.reps != null) out.reps = s.reps;
    if (s.weightGrams != null) out.weightGrams = s.weightGrams;
    if (s.durationSec != null) out.durationSec = s.durationSec;
    return out;
  };
  const same = i.last?.sets[i.doneInSession.length];
  if (same) return clean(same);
  const prev = i.doneInSession[i.doneInSession.length - 1];
  if (prev) return clean(prev);
  return clean({ reps: i.target.repsMin, durationSec: i.target.sec });
}

export const SET_LIMITS = { repsMax: 200, weightMaxGrams: 500_000, durationMaxSec: 3600 } as const;

export type SetProblem = 'missing-reps' | 'missing-weight' | 'missing-duration' | 'out-of-range';

export function validateSet(measure: ExerciseMeasure, s: SetInput): { ok: true } | { ok: false; reason: SetProblem } {
  const no = (reason: SetProblem) => ({ ok: false as const, reason });
  const intIn = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;
  if (measure === 'DURATION') {
    if (s.durationSec == null) return no('missing-duration');
    if (!intIn(s.durationSec, 1, SET_LIMITS.durationMaxSec)) return no('out-of-range');
  } else {
    if (s.reps == null) return no('missing-reps');
    if (measure === 'REPS_WEIGHT' && s.weightGrams == null) return no('missing-weight');
  }
  if (s.reps != null && !intIn(s.reps, 1, SET_LIMITS.repsMax)) return no('out-of-range');
  if (s.weightGrams != null && !intIn(s.weightGrams, 0, SET_LIMITS.weightMaxGrams)) return no('out-of-range');
  if (s.durationSec != null && !intIn(s.durationSec, 1, SET_LIMITS.durationMaxSec)) return no('out-of-range');
  return { ok: true };
}

/**
 * Checks do diário ao terminar: 0 séries → nada; só alongamentos (ou programa STRETCH) → alongamento;
 * senão treino (+ alongamento se também houve alongamentos). Só marcam, nunca desmarcam.
 */
export function diaryChecksFor(session: {
  setsCount: number;
  programKind: ProgramKind | null;
  exerciseCategories: string[];
}): { workoutDone: boolean; stretchDone: boolean } {
  if (session.setsCount === 0) return { workoutDone: false, stretchDone: false };
  const cats = session.exerciseCategories;
  const hasStretch = cats.includes('stretching');
  const onlyStretch = session.programKind === 'STRETCH' || (cats.length > 0 && cats.every((c) => c === 'stretching'));
  if (onlyStretch) return { workoutDone: false, stretchDone: true };
  return { workoutDone: true, stretchDone: hasStretch };
}

/** Uma sessão activa de cada vez. */
export function canStartSession(active: { id: string } | null): boolean {
  return active === null;
}

/** Sessão aberta há mais de 6 h é terminada na última série. */
export const AUTO_END_HOURS = 6;

/** Fim automático: a hora da última série (ou o início, sem séries) se a sessão está aberta há mais de 6 h. */
export function autoEndAt(i: { startedAt: Date; lastSetAt: Date | null; now: Date }): Date | null {
  if (i.now.getTime() - i.startedAt.getTime() < AUTO_END_HOURS * 3_600_000) return null;
  return i.lastSetAt ?? i.startedAt;
}

/** Volume de uma série (kg × reps), em gramas. */
export function setVolumeGrams(s: { reps: number | null; weightGrams: number | null }): number {
  return (s.reps ?? 0) * (s.weightGrams ?? 0);
}
