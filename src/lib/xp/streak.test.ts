import { describe, expect, it } from 'vitest';
import { addDays } from '@/lib/dates';
import { bestRun, currentMagicStreak, nextMilestone, runContaining, streakBonusCandidates } from './streak';

const days = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i));
const key = (c: { source: string; periodStart: string }) => `${c.source}:${c.periodStart}`;

describe('bónus do streak', () => {
  it('run de 7 dias → um bónus de 25 no 7.º dia', () => {
    expect(streakBonusCandidates({ start: '2026-05-01', length: 7 })).toEqual([
      { source: 'STREAK_BONUS', periodStart: '2026-05-07', points: 25 },
    ]);
  });

  it('run de 30 → dias 7, 14, 21, 28 (25) e 30 (100)', () => {
    const c = streakBonusCandidates({ start: '2026-05-01', length: 30 });
    expect(c).toEqual([
      { source: 'STREAK_BONUS', periodStart: '2026-05-07', points: 25 },
      { source: 'STREAK_BONUS', periodStart: '2026-05-14', points: 25 },
      { source: 'STREAK_BONUS', periodStart: '2026-05-21', points: 25 },
      { source: 'STREAK_BONUS', periodStart: '2026-05-28', points: 25 },
      { source: 'STREAK_BONUS', periodStart: '2026-05-30', points: 100 },
    ]);
  });

  it('marcos coincidentes ficam com o de mais pontos (dia 378 = 7×54; dia 365 = 1000)', () => {
    const c = streakBonusCandidates({ start: '2026-01-01', length: 365 });
    expect(c.at(-1)).toEqual({ source: 'STREAK_BONUS', periodStart: addDays('2026-01-01', 364), points: 1000 });
    const at100 = c.find((x) => x.periodStart === addDays('2026-01-01', 99));
    expect(at100?.points).toBe(300);
  });

  it('ligar dois runs preenchendo o dia do meio não duplica bónus já ganhos', () => {
    // Run A: 1–7 mai (bónus a 7). Run B: 9–15 mai (bónus a 15). Preencher dia 8 → run 1–15.
    const ledger = new Set<string>();
    const a = runContaining(days('2026-05-01', 7), '2026-05-07')!;
    streakBonusCandidates(a).forEach((c) => ledger.add(key(c)));
    const b = runContaining(days('2026-05-09', 7), '2026-05-15')!;
    streakBonusCandidates(b).forEach((c) => ledger.add(key(c)));
    expect([...ledger].sort()).toEqual(['STREAK_BONUS:2026-05-07', 'STREAK_BONUS:2026-05-15']);

    const joined = runContaining(days('2026-05-01', 15), '2026-05-08')!;
    expect(joined).toEqual({ start: '2026-05-01', end: '2026-05-15', length: 15 });
    const fresh = streakBonusCandidates(joined).filter((c) => !ledger.has(key(c)));
    // Novo marco: dia 14 do run (14 mai). O de 15 mai (do run B) fica como estava — nunca é retirado.
    expect(fresh).toEqual([{ source: 'STREAK_BONUS', periodStart: '2026-05-14', points: 25 }]);
  });

  it('run de 1 dia cujo início recua → sem bónus anteriores', () => {
    expect(streakBonusCandidates(runContaining(['2026-05-10'], '2026-05-10')!)).toEqual([]);
    const moved = runContaining(['2026-05-09', '2026-05-10'], '2026-05-09')!;
    expect(moved.start).toBe('2026-05-09');
    expect(streakBonusCandidates(moved)).toEqual([]);
  });
});

describe('streak actual e melhor', () => {
  const run = days('2026-05-01', 5); // 1–5 mai

  it('termina ontem → conta', () => {
    expect(currentMagicStreak(run, '2026-05-06')).toBe(5);
  });
  it('termina hoje → conta', () => {
    expect(currentMagicStreak(run, '2026-05-05')).toBe(5);
  });
  it('termina anteontem → 0', () => {
    expect(currentMagicStreak(run, '2026-05-07')).toBe(0);
  });
  it('bestRun', () => {
    expect(bestRun([...run, ...days('2026-05-10', 8), '2026-06-01'])).toBe(8);
    expect(bestRun([])).toBe(0);
  });
  it('próximo marco', () => {
    expect(nextMilestone(4)).toEqual({ inDays: 3, points: 25 });
    expect(nextMilestone(0)).toEqual({ inDays: 7, points: 25 });
    expect(nextMilestone(28)).toEqual({ inDays: 2, points: 100 });
  });
});
