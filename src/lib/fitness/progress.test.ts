import { describe, expect, it } from 'vitest';
import { bestsOf, compareWithPrevious, dayStats, detectPrs, e1rm, EMPTY_BESTS, recomputePrs, summarize } from './progress';

describe('e1rm', () => {
  it('Epley até 12 reps', () => {
    expect(e1rm(60000, 10)).toBe(80000);
    expect(e1rm(60000, 15)).toBeNull();
  });
});

describe('detectPrs', () => {
  it('primeira vez não é recorde', () => {
    expect(detectPrs({ reps: 10, weightGrams: 60000 }, EMPTY_BESTS)).toEqual([]);
  });
  it('peso maior', () => {
    expect(detectPrs({ reps: 5, weightGrams: 70000 }, bestsOf([{ reps: 10, weightGrams: 60000 }]))).toContain('weight');
  });
  it('mesmo peso com mais reps', () => {
    expect(detectPrs({ reps: 11, weightGrams: 60000 }, bestsOf([{ reps: 10, weightGrams: 60000 }]))).toContain('reps');
    expect(detectPrs({ reps: 11, weightGrams: 60000 }, bestsOf([{ reps: 10, weightGrams: 60000 }]))).not.toContain('weight');
  });
});

describe('recomputePrs', () => {
  const at = (m: number) => new Date(Date.UTC(2026, 9, 1, 10, m));
  const sets = [
    { id: 'a', completedAt: at(0), reps: 10, weightGrams: 60000 },
    { id: 'b', completedAt: at(5), reps: 8, weightGrams: 70000 },
    { id: 'c', completedAt: at(10), reps: 6, weightGrams: 65000 },
  ];
  it('marca o recorde e passa-o à seguinte quando a série é apagada', () => {
    expect(recomputePrs(sets).b).toContain('weight');
    expect(recomputePrs(sets).c).not.toContain('weight');
    const after = recomputePrs(sets.filter((s) => s.id !== 'b'));
    expect(after.a).toEqual([]);
    expect(after.c).toContain('weight');
  });
});

describe('comparação e dia', () => {
  it('compareWithPrevious', () => {
    const cur = summarize([{ reps: 10, weightGrams: 60000 }, { reps: 10, weightGrams: 60000 }, { reps: 10, weightGrams: 60000 }]);
    const prev = summarize([{ reps: 9, weightGrams: 60000 }, { reps: 9, weightGrams: 60000 }, { reps: 9, weightGrams: 60000 }]);
    const c = compareWithPrevious(cur, prev);
    expect(c.reps).toEqual({ value: 30, delta: 3, pct: 11.1 });
    const zero = compareWithPrevious(cur, { ...prev, reps: 0 });
    expect(zero.reps!.pct).toBeNull();
  });

  it('dayStats', () => {
    const t = (m: number) => new Date(Date.UTC(2026, 9, 1, 10, m));
    const s = (exerciseId: string, w: number, reps: number, m: number) => ({ exerciseId, weightGrams: w, reps, completedAt: t(m), prKinds: [] as string[] });
    const out = dayStats([
      {
        startedAt: t(0),
        endedAt: t(30),
        sets: [s('a', 60000, 11, 2), s('a', 60000, 10, 4), s('a', 60000, 10, 6), s('b', 100000, 10, 10), { ...s('b', 100000, 9, 14), prKinds: ['reps'] }],
      },
    ]);
    expect(out).toMatchObject({ sets: 5, reps: 50, exercises: 2, volumeGrams: 3_760_000, durationSec: 1800, sessionTimeSec: 720, avgRestSec: 180, prs: 1 });
  });
});
