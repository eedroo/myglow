import { describe, expect, it } from 'vitest';
import { funnelRates } from './funnel';

describe('funnelRates', () => {
  it('percentagens em relação ao passo anterior', () => {
    expect(funnelRates({ registered: 10, birthDone: 8, tourDone: 4, firstLesson: 2, firstCompleteDay: 1 })).toEqual([
      { step: 'registered', count: 10, pctOfPrev: 100 },
      { step: 'birthDone', count: 8, pctOfPrev: 80 },
      { step: 'tourDone', count: 4, pctOfPrev: 50 },
      { step: 'firstLesson', count: 2, pctOfPrev: 50 },
      { step: 'firstCompleteDay', count: 1, pctOfPrev: 50 },
    ]);
  });

  it('passo anterior 0 → 0', () => {
    const r = funnelRates({ registered: 0, birthDone: 0, tourDone: 0, firstLesson: 0, firstCompleteDay: 0 });
    expect(r.every((s) => s.pctOfPrev === 0)).toBe(true);
  });
});
