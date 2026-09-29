import type { ProjectsPatch } from '@/types/planner';

/** Junta dois patches de planner; `projects` por área (a última escrita ganha). */
export function mergePlanPatches<T extends { projects?: ProjectsPatch }>(a: T, b: T): T {
  const merged = { ...a, ...b };
  if (a.projects || b.projects) {
    const byArea = new Map([...(a.projects ?? []), ...(b.projects ?? [])].map((p) => [p.area, p]));
    merged.projects = [...byArea.values()];
  }
  return merged;
}
