import type { WeekPatch } from '@/types/week';

/** Junta dois patches da semana; `dayNotes` e `projects` por chave (a última escrita ganha). */
export function mergeWeekPatches(a: WeekPatch, b: WeekPatch): WeekPatch {
  const merged: WeekPatch = { ...a, ...b };
  if (a.dayNotes || b.dayNotes) {
    const byDate = new Map([...(a.dayNotes ?? []), ...(b.dayNotes ?? [])].map((n) => [n.date, n]));
    merged.dayNotes = [...byDate.values()];
  }
  if (a.projects || b.projects) {
    const byArea = new Map([...(a.projects ?? []), ...(b.projects ?? [])].map((p) => [p.area, p]));
    merged.projects = [...byArea.values()];
  }
  return merged;
}
