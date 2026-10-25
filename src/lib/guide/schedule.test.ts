import { describe, expect, it } from 'vitest';
import { dueGuideJobs } from './schedule';

describe('dueGuideJobs', () => {
  it('domingo às 04:00 locais: a semana anterior', () => {
    // 2026-10-25 é domingo; 07:00 UTC = 04:00 em São Paulo
    expect(dueGuideJobs(new Date('2026-10-25T07:00:00Z'), 'America/Sao_Paulo')).toEqual([{ kind: 'WEEK', periodKey: '2026-10-18' }]);
  });

  it('domingo às 05:00 locais: já não', () => {
    expect(dueGuideJobs(new Date('2026-10-25T08:00:00Z'), 'America/Sao_Paulo')).toEqual([]);
  });

  it('dia 1 (domingo) às 05:00 em Lisboa: o mês anterior (e a semana já passou)', () => {
    // 2026-11-01 é domingo; Lisboa em UTC+0 no inverno
    expect(dueGuideJobs(new Date('2026-11-01T05:00:00Z'), 'Europe/Lisbon')).toEqual([{ kind: 'MONTH', periodKey: '2026-10' }]);
    expect(dueGuideJobs(new Date('2026-11-01T04:00:00Z'), 'Europe/Lisbon')).toEqual([{ kind: 'WEEK', periodKey: '2026-10-25' }]);
  });
});
