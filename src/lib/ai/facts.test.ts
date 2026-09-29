import { describe, expect, it } from 'vitest';
import { computeNatalChart } from '@/lib/astro/natal';
import { toBirthUtc } from '@/lib/birth';
import { buildDayFacts, buildPeriodFacts, buildPersonalDayFacts, buildPersonalPeriodFacts } from './facts';

const TZ = 'Europe/Lisbon';
const chart = computeNatalChart({
  birthUtc: toBirthUtc('1990-07-15', '14:30', TZ), latitude: 38.72, longitude: -9.14, timeKnown: true,
  birthDate: '1990-07-15', birthTz: TZ,
});
const minutes = (a: string, b: string) => {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return Math.abs(ah! * 60 + am! - (bh! * 60 + bm!));
};

describe('buildDayFacts', () => {
  it('2026-05-06 em Lisboa: Lua em Capricórnio', () => {
    const f = buildDayFacts('2026-05-06', TZ, 'NORTH');
    expect(f.moon.sign).toBe('CAPRICORN');
    expect(f.sun.sign).toBe('TAURUS');
    expect(f.moon.ingress).toBeNull();
  });

  it('2026-05-08: ingresso em Aquário às 08:27 (hora local)', () => {
    const f = buildDayFacts('2026-05-08', TZ, 'NORTH');
    expect(f.moon.ingress?.sign).toBe('AQUARIUS');
    expect(minutes(f.moon.ingress!.time!, '08:27')).toBeLessThanOrEqual(3);
  });

  it('conteúdo partilhado: sem horas e sem sabbats', () => {
    const f = buildDayFacts('2026-05-05', TZ, 'NORTH', { shared: true });
    expect(JSON.stringify(f)).not.toMatch(/"time"/);
    expect(f.skyEvents.some((e) => e.type === 'SABBAT')).toBe(false);
    const personal = buildDayFacts('2026-05-05', TZ, 'NORTH');
    expect(personal.skyEvents.some((e) => e.type === 'SABBAT' && e.label === 'BELTANE')).toBe(true);
  });

  it('retrógrados activos no dia', () => {
    expect(buildDayFacts('2026-07-10', TZ, 'NORTH').retrogrades).toEqual(['MERCURY']);
    expect(buildDayFacts('2026-08-10', TZ, 'NORTH').retrogrades).toEqual([]);
  });
});

describe('factos pessoais', () => {
  it('sem intenções → a chave não existe', () => {
    const f = buildPersonalDayFacts({ date: '2026-05-06', tz: TZ, hemisphere: 'NORTH', chart });
    expect('intentions' in f).toBe(false);
    expect(f.natal.sun).toBe('CANCER');
    expect(f.moonTransitHouse).toBeGreaterThanOrEqual(1);
    expect(f.aspects.length).toBeLessThanOrEqual(5);
  });

  it('intenções vazias não entram; preenchidas sim', () => {
    const empty = buildPersonalDayFacts({ date: '2026-05-06', tz: TZ, hemisphere: 'NORTH', chart, intentions: { day: '  ', projects: {} } });
    expect('intentions' in empty).toBe(false);
    const full = buildPersonalDayFacts({ date: '2026-05-06', tz: TZ, hemisphere: 'NORTH', chart, intentions: { day: 'Calma', projects: { MAGIC: 'Lua' } } });
    expect(full.intentions).toEqual({ day: 'Calma', projects: { MAGIC: 'Lua' } });
  });

  it('período: eventos lunares, ingressos do Sol e aspectos exactos dentro do mês', () => {
    const f = buildPersonalPeriodFacts({ from: '2026-05-01', to: '2026-05-31', tz: TZ, hemisphere: 'NORTH', chart });
    expect(f.moonEvents.some((e) => e.phase === 'FULL_MOON' && e.date === '2026-05-01')).toBe(true);
    expect(f.sunSigns.map((s) => s.sign)).toEqual(['TAURUS', 'GEMINI']);
    expect(f.keyAspects.length).toBeLessThanOrEqual(8);
    expect(f.keyAspects.every((a) => a.date >= '2026-05-01' && a.date <= '2026-05-31')).toBe(true);
  });

  it('período partilhado não traz sabbats', () => {
    const f = buildPeriodFacts('2026-05-01', '2026-05-31', TZ, 'NORTH', { shared: true });
    expect(f.skyEvents.some((e) => e.type === 'SABBAT')).toBe(false);
  });
});
