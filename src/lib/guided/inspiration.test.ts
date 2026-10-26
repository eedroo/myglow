import { describe, expect, it } from 'vitest';
import type { SkyEvent } from '@/lib/astro/skyEvents';
import { areaInspiration, periodMoments, ritualsIn, SUGGESTION } from './inspiration';

const ev = (e: Partial<SkyEvent> & { type: SkyEvent['type']; date: string }) => ({ at: `${e.date}T12:00:00Z`, ...e }) as SkyEvent;

describe('inspiração para planear', () => {
  const events = [
    ev({ type: 'MOON_PHASE', date: '2026-11-09', phase: 'NEW_MOON', sign: 'SCORPIO' } as never),
    ev({ type: 'SUN_INGRESS', date: '2026-11-22', sign: 'SAGITTARIUS' } as never),
    ev({ type: 'MOON_PHASE', date: '2026-11-24', phase: 'FULL_MOON', sign: 'GEMINI' } as never),
    ev({ type: 'SABBAT', date: '2026-11-01', sabbat: 'SAMHAIN' } as never),
    ev({ type: 'MOON_PHASE', date: '2026-12-01', phase: 'LAST_QUARTER', sign: 'VIRGO' } as never),
  ];
  it('semana e mês: fases da lua, sabbats e estações dentro do período, por ordem', () => {
    const m = periodMoments(events, '2026-11-01', '2026-11-30', { moonPhases: true });
    expect(m.map((x) => x.kind)).toEqual(['SABBAT', 'NEW_MOON', 'FULL_MOON']);
    expect(m[1]).toMatchObject({ date: '2026-11-09', sign: 'SCORPIO' });
    expect(SUGGESTION.NEW_MOON).toBe('begin');
    expect(SUGGESTION.FULL_MOON).toBe('celebrate');
  });
  it('ano: sem fases da lua', () => {
    expect(periodMoments(events, '2026-01-01', '2026-12-31', { moonPhases: false }).map((x) => x.kind)).toEqual(['SABBAT']);
  });
  it('rituais do período e inspiração por área', () => {
    const rituals = [
      { id: 'a', title: 'Semear', date: '2026-11-09', occasion: 'Lua Nova', intention: 'x', area: 'MAGIC' as const },
      { id: 'b', title: 'Soltar', date: '2026-12-02', occasion: 'Minguante', intention: 'y', area: 'PERSONAL' as const },
    ];
    const inPeriod = ritualsIn(rituals, '2026-11-08', '2026-11-14');
    expect(inPeriod.map((r) => r.id)).toEqual(['a']);
    const areas = areaInspiration([{ area: 'PROFESSIONAL', note: 'Fecha o que ficou aberto.' }], inPeriod);
    expect(areas.PROFESSIONAL).toEqual({ note: 'Fecha o que ficou aberto.', rituals: [] });
    expect(areas.MAGIC!.rituals[0]!.title).toBe('Semear');
    expect(areas.LEISURE).toBeUndefined();
  });
});
