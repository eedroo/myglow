import { describe, expect, it } from 'vitest';
import { activeByDay, activeUsers } from './active';

describe('activeUsers', () => {
  const today = '2026-11-02';
  const rows = [
    { userId: 'a', day: '2026-11-02' }, // hoje
    { userId: 'a', day: '2026-11-01' },
    { userId: 'b', day: '2026-10-29' }, // há 4 dias (WAU)
    { userId: 'c', day: '2026-10-10' }, // há 23 dias (só MAU)
    { userId: 'd', day: '2026-09-01' }, // fora
  ];

  it('3 pessoas com dias conhecidos → DAU 1, WAU 2, MAU 3, stickiness 1/3', () => {
    expect(activeUsers(rows, today)).toEqual({ dau: 1, wau: 2, mau: 3, stickiness: 1 / 3 });
  });

  it('MAU 0 → stickiness 0', () => {
    expect(activeUsers([], today)).toEqual({ dau: 0, wau: 0, mau: 0, stickiness: 0 });
  });

  it('activos por dia: n dias até hoje, do mais antigo para o mais recente', () => {
    expect(activeByDay(rows, today, 3)).toEqual([
      { day: '2026-10-31', count: 0 },
      { day: '2026-11-01', count: 1 },
      { day: '2026-11-02', count: 1 },
    ]);
  });
});
