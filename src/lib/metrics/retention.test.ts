import { describe, expect, it } from 'vitest';
import { retention } from './retention';

describe('retention', () => {
  const today = '2026-11-25'; // quarta; semana actual começa a 22/11
  it('coorte de 2 em que 1 volta no dia 1 → d1 = 50', () => {
    const signups = [
      { userId: 'a', createdDay: '2026-10-04' }, // coorte de 04/10 (domingo)
      { userId: 'b', createdDay: '2026-10-05' },
    ];
    const rows = [{ userId: 'a', day: '2026-10-05' }];
    const r = retention(signups, rows, today, 8);
    const cohort = r.find((c) => c.cohortStart === '2026-10-04')!;
    expect(cohort).toMatchObject({ size: 2, d1: 50, d7: 0, d30: 0 });
  });

  it('coorte da semana actual: d7 e d30 ainda null', () => {
    const r = retention([{ userId: 'x', createdDay: '2026-11-22' }], [], today, 2);
    const current = r.at(-1)!;
    expect(current.cohortStart).toBe('2026-11-22');
    expect(current.d7).toBeNull();
    expect(current.d30).toBeNull();
  });

  it('últimas N semanas a acabar na de hoje; coortes vazias com dN null', () => {
    const r = retention([], [], today, 3);
    expect(r.map((c) => c.cohortStart)).toEqual(['2026-11-08', '2026-11-15', '2026-11-22']);
    expect(r[0]).toEqual({ cohortStart: '2026-11-08', size: 0, d1: null, d7: null, d30: null });
  });
});
