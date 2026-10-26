import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { lastTrainedByMuscle, muscleRecovery, MUSCLE_MAP } from './muscles';

describe('MUSCLE_MAP', () => {
  it('cobre todo o vocabulário da biblioteca', () => {
    const src = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/exercises/source/exercises.json'), 'utf8')) as {
      primaryMuscles: string[];
      secondaryMuscles: string[];
    }[];
    const vocab = new Set(src.flatMap((e) => [...e.primaryMuscles, ...e.secondaryMuscles]));
    for (const m of vocab) expect(MUSCLE_MAP, m).toHaveProperty(m);
  });
});

describe('muscleRecovery', () => {
  const now = new Date('2026-10-26T12:00:00Z');
  const ago = (h: number) => new Date(now.getTime() - h * 3_600_000);
  it('48 h e 72 h', () => {
    const r = muscleRecovery({ chest: ago(24), quadriceps: ago(60), biceps: ago(120) }, now);
    expect(r.chest).toBe('just-trained');
    expect(r.quadriceps).toBe('recovering');
    expect(r.biceps).toBe('rested');
    expect(r.calves).toBe('rested');
  });
  it('secundários só chegam a "a recuperar"', () => {
    const { primary, secondary } = lastTrainedByMuscle([{ completedAt: ago(10), primary: ['chest'], secondary: ['triceps'] }]);
    const r = muscleRecovery(primary, now, secondary);
    expect(r.chest).toBe('just-trained');
    expect(r.triceps).toBe('recovering');
  });
});
