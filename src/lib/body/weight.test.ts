import { describe, expect, it } from 'vitest';
import { goalStatus, rangeBounds, rollingAverage, weekAverage, weeklyAverages } from './weight';

const pts = (xs: [string, number][]) => xs.map(([date, grams]) => ({ date, grams }));

describe('médias', () => {
  it('weekAverage (domingo a sábado)', () => {
    const p = pts([['2026-10-18', 76000], ['2026-10-20', 76400], ['2026-10-24', 76800], ['2026-10-25', 90000]]);
    expect(weekAverage(p, '2026-10-18')).toBe(76400);
    expect(weekAverage([], '2026-10-18')).toBeNull();
  });

  it('weeklyAverages cobre as semanas do intervalo', () => {
    const p = pts([['2026-10-12', 77000], ['2026-10-20', 76000]]);
    expect(weeklyAverages(p, '2026-10-11', '2026-10-24')).toEqual([
      { weekStart: '2026-10-11', avgGrams: 77000, count: 1 },
      { weekStart: '2026-10-18', avgGrams: 76000, count: 1 },
    ]);
  });

  it('rollingAverage usa só os dias com dados dentro da janela', () => {
    const p = pts([['2026-10-01', 80000], ['2026-10-05', 78000], ['2026-10-09', 76000]]);
    expect(rollingAverage(p).map((x) => x.grams)).toEqual([80000, 79000, 77000]);
  });

  it('rangeBounds', () => {
    expect(rangeBounds('6M', '2026-10-25')).toEqual({ from: '2026-04-26', to: '2026-10-25' });
    expect(rangeBounds('M', '2026-10-25').from).toBe('2026-09-26');
    expect(rangeBounds('Y', '2026-10-25').from).toBe('2025-10-26');
  });
});

describe('goalStatus', () => {
  const gain = { direction: 'GAIN' as const, weeklyRateGrams: 250, targetGrams: null };
  it('ganhar 250 g/semana', () => {
    expect(goalStatus(gain, 76300, 76000).status).toBe('on-track');
    expect(goalStatus(gain, 76600, 76000).status).toBe('above');
    expect(goalStatus(gain, 75900, 76000).status).toBe('below');
  });
  it('manter ± 250 g', () => {
    expect(goalStatus({ direction: 'MAINTAIN', weeklyRateGrams: 0, targetGrams: null }, 76200, 76000).status).toBe('on-track');
  });
  it('sem a média anterior', () => {
    expect(goalStatus(gain, 76000, null).status).toBe('not-enough-data');
  });
  it('semanas até ao alvo', () => {
    const s = goalStatus({ ...gain, targetGrams: 78000 }, 76000, 75800);
    expect(s.toTargetGrams).toBe(2000);
    expect(s.weeksToTarget).toBe(8);
  });
});
