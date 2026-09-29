import { describe, expect, it } from 'vitest';
import { windowState } from './window';

const TZ = 'Europe/Lisbon';

describe('windowState', () => {
  it('plano da semana: aberto na segunda, até terça', () => {
    expect(windowState('WEEK_PLAN', '2026-05-03', TZ, new Date('2026-05-04T10:00:00Z'), [])).toEqual({
      source: 'WEEK_PLAN', phase: 'open', points: 20, from: '2026-04-30', until: '2026-05-05',
    });
  });
  it('reflexão da semana: ainda não abriu na segunda (abre sexta, até domingo)', () => {
    expect(windowState('WEEK_REFLECTION', '2026-05-03', TZ, new Date('2026-05-04T10:00:00Z'), [])).toMatchObject({
      phase: 'upcoming', from: '2026-05-08', until: '2026-05-10',
    });
  });
  it('plano já ganho → earned, mesmo com a janela fechada', () => {
    expect(windowState('WEEK_PLAN', '2026-05-03', TZ, new Date('2026-05-20T10:00:00Z'), ['WEEK_PLAN']).phase).toBe('earned');
  });
  it('janela passada → closed', () => {
    expect(windowState('WEEK_PLAN', '2026-05-03', TZ, new Date('2026-05-20T10:00:00Z'), []).phase).toBe('closed');
  });
  it('dia: aberto até ao fim do dia seguinte', () => {
    expect(windowState('DAY_MORNING', '2026-05-06', TZ, new Date('2026-05-07T20:00:00Z'), [])).toMatchObject({
      phase: 'open', until: '2026-05-07',
    });
  });
});
