import type { SetInput } from './types';

/**
 * Evolução nos treinos (F17). Puro. Recordes (peso, e1RM e reps por peso), resumo por exercício, comparação com a
 * sessão anterior e métricas do dia. A primeira vez que se faz um exercício nunca é recorde.
 */

export type PrKind = 'weight' | 'e1rm' | 'reps';
type SetValues = Omit<SetInput, 'exerciseId'>;

/** Epley: w × (1 + reps/30), só 1 a 12 reps, arredondado a 100 g. */
export function e1rm(weightGrams: number, reps: number): number | null {
  if (!(weightGrams > 0) || reps < 1 || reps > 12) return null;
  return Math.round((weightGrams * (1 + reps / 30)) / 100) * 100;
}

export interface ExerciseBests {
  weightGrams: number | null;
  e1rmGrams: number | null;
  /** peso (g, 0 = sem peso) → máx. reps */
  repsAtWeight: Record<number, number>;
}

export const EMPTY_BESTS: ExerciseBests = { weightGrams: null, e1rmGrams: null, repsAtWeight: {} };

const isEmpty = (b: ExerciseBests) => b.weightGrams == null && b.e1rmGrams == null && Object.keys(b.repsAtWeight).length === 0;

export function detectPrs(set: SetValues, before: ExerciseBests): PrKind[] {
  if (isEmpty(before)) return [];
  const out: PrKind[] = [];
  if (set.weightGrams != null && before.weightGrams != null && set.weightGrams > before.weightGrams) out.push('weight');
  const e = set.weightGrams != null && set.reps != null ? e1rm(set.weightGrams, set.reps) : null;
  if (e != null && before.e1rmGrams != null && e > before.e1rmGrams) out.push('e1rm');
  if (set.reps != null) {
    const w = set.weightGrams ?? 0;
    const atOrAbove = Object.entries(before.repsAtWeight).filter(([k]) => Number(k) >= w).map(([, r]) => r);
    if (atOrAbove.length && set.reps > Math.max(...atOrAbove)) out.push('reps');
  }
  return out;
}

/** Junta uma série aos melhores valores. */
export function addToBests(b: ExerciseBests, set: SetValues): ExerciseBests {
  const next: ExerciseBests = { weightGrams: b.weightGrams, e1rmGrams: b.e1rmGrams, repsAtWeight: { ...b.repsAtWeight } };
  if (set.weightGrams != null) next.weightGrams = Math.max(next.weightGrams ?? 0, set.weightGrams);
  const e = set.weightGrams != null && set.reps != null ? e1rm(set.weightGrams, set.reps) : null;
  if (e != null) next.e1rmGrams = Math.max(next.e1rmGrams ?? 0, e);
  if (set.reps != null) {
    const w = set.weightGrams ?? 0;
    next.repsAtWeight[w] = Math.max(next.repsAtWeight[w] ?? 0, set.reps);
  }
  return next;
}

export function bestsOf(sets: SetValues[]): ExerciseBests {
  return sets.reduce(addToBests, EMPTY_BESTS);
}

/** Recalcula os recordes de um exercício por ordem (completedAt, id). Mesma regra que a migração `body_two`. */
export function recomputePrs(
  sets: { id: string; completedAt: Date; reps: number | null; weightGrams: number | null }[],
): Record<string, PrKind[]> {
  const sorted = [...sets].sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const out: Record<string, PrKind[]> = {};
  let bests = EMPTY_BESTS;
  for (const s of sorted) {
    const v = { reps: s.reps ?? undefined, weightGrams: s.weightGrams ?? undefined };
    out[s.id] = detectPrs(v, bests);
    bests = addToBests(bests, v);
  }
  return out;
}

export interface SessionExerciseSummary {
  sets: number;
  reps: number;
  volumeGrams: number;
  avgWeightPerRepGrams: number | null;
  bestE1rmGrams: number | null;
}

export function summarize(sets: SetValues[]): SessionExerciseSummary {
  const reps = sets.reduce((n, s) => n + (s.reps ?? 0), 0);
  const volumeGrams = sets.reduce((n, s) => n + (s.reps ?? 0) * (s.weightGrams ?? 0), 0);
  const weighted = sets.some((s) => s.weightGrams != null);
  const e = sets.map((s) => (s.weightGrams != null && s.reps != null ? e1rm(s.weightGrams, s.reps) : null)).filter((x): x is number => x != null);
  return {
    sets: sets.length,
    reps,
    volumeGrams,
    avgWeightPerRepGrams: weighted && reps > 0 ? Math.round(volumeGrams / reps) : null,
    bestE1rmGrams: e.length ? Math.max(...e) : null,
  };
}

export interface Comparison {
  value: number;
  delta: number;
  pct: number | null;
}

export function compareWithPrevious(
  current: SessionExerciseSummary,
  previous: SessionExerciseSummary | null,
): Record<keyof SessionExerciseSummary, Comparison | null> {
  const keys: (keyof SessionExerciseSummary)[] = ['sets', 'reps', 'volumeGrams', 'avgWeightPerRepGrams', 'bestE1rmGrams'];
  const out = {} as Record<keyof SessionExerciseSummary, Comparison | null>;
  for (const k of keys) {
    const v = current[k];
    const p = previous?.[k];
    out[k] = v == null || p == null ? null : { value: v, delta: v - p, pct: p === 0 ? null : Math.round(((v - p) / p) * 1000) / 10 };
  }
  return out;
}

export interface DayStats {
  sets: number;
  reps: number;
  exercises: number;
  volumeGrams: number;
  durationSec: number | null;
  sessionTimeSec: number;
  avgRestSec: number | null;
  prs: number;
}

/** Métricas de um dia (uma ou mais sessões). */
export function dayStats(
  sessions: { startedAt: Date; endedAt: Date | null; sets: (SetInput & { completedAt: Date; prKinds: string[] })[] }[],
): DayStats {
  const all = sessions.flatMap((s) => s.sets);
  const ended = sessions.filter((s) => s.endedAt);
  const gaps: number[] = [];
  let sessionTimeSec = 0;
  for (const s of sessions) {
    const t = s.sets.map((x) => x.completedAt.getTime()).sort((a, b) => a - b);
    for (let i = 1; i < t.length; i++) gaps.push((t[i]! - t[i - 1]!) / 1000);
    if (t.length) sessionTimeSec += Math.round((t[t.length - 1]! - t[0]!) / 1000);
  }
  return {
    sets: all.length,
    reps: all.reduce((n, s) => n + (s.reps ?? 0), 0),
    exercises: new Set(all.map((s) => s.exerciseId)).size,
    volumeGrams: all.reduce((n, s) => n + (s.reps ?? 0) * (s.weightGrams ?? 0), 0),
    durationSec: ended.length ? ended.reduce((n, s) => n + Math.round((s.endedAt!.getTime() - s.startedAt.getTime()) / 1000), 0) : null,
    sessionTimeSec,
    avgRestSec: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
    prs: all.filter((s) => s.prKinds.length > 0).length,
  };
}
