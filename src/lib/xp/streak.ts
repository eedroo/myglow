import { addDays, compareDates, type DateISO } from '@/lib/dates';
import type { XpCandidate } from './rules';

/**
 * Streak mágico: dias consecutivos com pelo menos um evento DAY_* no ledger
 * (dias que contaram dentro da janela). Funções puras.
 */

const sortedUnique = (dates: DateISO[]) => [...new Set(dates)].sort(compareDates);

/** Run de dias consecutivos que contém `day`, ou null se `day` não está na lista. */
export function runContaining(dates: DateISO[], day: DateISO): { start: DateISO; end: DateISO; length: number } | null {
  const set = new Set(dates);
  if (!set.has(day)) return null;
  let start = day;
  while (set.has(addDays(start, -1))) start = addDays(start, -1);
  let end = day;
  while (set.has(addDays(end, 1))) end = addDays(end, 1);
  let length = 1;
  for (let d = start; d !== end; d = addDays(d, 1)) length++;
  return { start, end, length };
}

/** Streak actual: conta se o run termina hoje ou ontem; senão 0. */
export function currentMagicStreak(dates: DateISO[], today: DateISO): number {
  const set = new Set(dates);
  const anchor = set.has(today) ? today : set.has(addDays(today, -1)) ? addDays(today, -1) : null;
  return anchor ? runContaining(dates, anchor)!.length : 0;
}

export function bestRun(dates: DateISO[]): number {
  const list = sortedUnique(dates);
  let best = 0;
  let run = 0;
  for (let i = 0; i < list.length; i++) {
    run = i > 0 && addDays(list[i - 1]!, 1) === list[i] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export const STREAK_MILESTONES: { every?: number; at?: number; points: number }[] = [
  { every: 7, points: 25 }, // 7, 14, 21, …
  { at: 30, points: 100 },
  { at: 100, points: 300 },
  { at: 365, points: 1000 },
];

/** Pontos do marco atingido no dia `k` do run (0 se não é marco); se coincidirem, fica o maior. */
export function milestonePoints(k: number): number {
  let best = 0;
  for (const m of STREAK_MILESTONES) {
    const hit = (m.every !== undefined && k % m.every === 0) || m.at === k;
    if (hit) best = Math.max(best, m.points);
  }
  return best;
}

/** Bónus de cada marco do run (periodStart = dia em que o marco foi atingido). Idempotente pela unique do ledger. */
export function streakBonusCandidates(run: { start: DateISO; length: number }): XpCandidate[] {
  const out: XpCandidate[] = [];
  for (let k = 1; k <= run.length; k++) {
    const points = milestonePoints(k);
    if (points > 0) out.push({ source: 'STREAK_BONUS', periodStart: addDays(run.start, k - 1), points });
  }
  return out;
}

/** Próximo marco a partir de um streak actual: dias que faltam e pontos. */
export function nextMilestone(streak: number): { inDays: number; points: number } {
  for (let k = streak + 1; ; k++) {
    const points = milestonePoints(k);
    if (points > 0) return { inDays: k - streak, points };
  }
}
