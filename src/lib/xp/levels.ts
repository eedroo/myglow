/** Níveis do Glow. Função pura. */
export const LEVELS = [
  { level: 1, key: 'seed', minXp: 0 },
  { level: 2, key: 'sprout', minXp: 300 },
  { level: 3, key: 'flame', minXp: 1000 },
  { level: 4, key: 'moon', minXp: 2500 },
  { level: 5, key: 'star', minXp: 5000 },
  { level: 6, key: 'sun', minXp: 9000 },
  { level: 7, key: 'constellation', minXp: 15000 },
] as const;

export type LevelKey = (typeof LEVELS)[number]['key'];

export interface LevelInfo {
  level: number;
  key: LevelKey;
  minXp: number;
  nextMinXp: number | null;
  progress: number; // 0–1 dentro do nível
}

export function levelFor(xp: number): LevelInfo {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]!.minXp) idx = i;
  const current = LEVELS[idx]!;
  const next = LEVELS[idx + 1];
  const progress = next ? Math.min(1, Math.max(0, (xp - current.minXp) / (next.minXp - current.minXp))) : 1;
  return { level: current.level, key: current.key, minXp: current.minXp, nextMinXp: next?.minXp ?? null, progress };
}
