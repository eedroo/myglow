import { describe, expect, it } from 'vitest';
import { getRetrogradePeriods, getSkyEvents, type SkyEvent } from './skyEvents';

const TZ = 'Europe/Lisbon';
const year = getSkyEvents('2026-01-01', '2026-12-31', TZ, 'NORTH');
const yearSouth = getSkyEvents('2026-01-01', '2026-12-31', TZ, 'SOUTH');

const minutes = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60_000;
const days = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
const ofType = <T extends SkyEvent['type']>(events: SkyEvent[], type: T) =>
  events.filter((e): e is Extract<SkyEvent, { type: T }> => e.type === type);

describe('eclipses de 2026', () => {
  it.each([
    ['SOLAR_ECLIPSE', 'annular', '2026-02-17T12:12:00Z'],
    ['LUNAR_ECLIPSE', 'total', '2026-03-03T11:34:00Z'],
    ['SOLAR_ECLIPSE', 'total', '2026-08-12T17:46:00Z'],
    ['LUNAR_ECLIPSE', 'partial', '2026-08-28T04:13:00Z'],
  ] as const)('%s %s ≈ %s', (type, kind, at) => {
    const match = year.find((e) => e.type === type && 'kind' in e && e.kind === kind && minutes(e.at, at) < 5);
    expect(match).toBeDefined();
  });

  it('só 4 eclipses em 2026', () => {
    expect(year.filter((e) => e.type.endsWith('ECLIPSE'))).toHaveLength(4);
  });
});

describe('estações do ano', () => {
  it.each([
    ['MARCH_EQUINOX', '2026-03-20T14:46:00Z'],
    ['JUNE_SOLSTICE', '2026-06-21T08:25:00Z'],
    ['SEPTEMBER_EQUINOX', '2026-09-23T00:06:00Z'],
    ['DECEMBER_SOLSTICE', '2026-12-21T20:50:00Z'],
  ] as const)('%s ≈ %s', (season, at) => {
    const e = ofType(year, 'SEASON').find((s) => s.season === season);
    expect(minutes(e!.at, at)).toBeLessThan(5);
  });
});

describe('Sol', () => {
  it('entra em Gémeos a 2026-05-21T00:37Z', () => {
    const e = ofType(year, 'SUN_INGRESS').find((s) => s.sign === 'GEMINI');
    expect(minutes(e!.at, '2026-05-21T00:37:00Z')).toBeLessThan(5);
    expect(ofType(year, 'SUN_INGRESS')).toHaveLength(12);
  });

  it('Sol a 45° (5 de maio) é Beltane no Norte e Samhain no Sul', () => {
    const north = ofType(year, 'SABBAT').find((s) => minutes(s.at, '2026-05-05T11:49:00Z') < 5);
    const south = ofType(yearSouth, 'SABBAT').find((s) => minutes(s.at, '2026-05-05T11:49:00Z') < 5);
    expect(north?.sabbat).toBe('BELTANE');
    expect(south?.sabbat).toBe('SAMHAIN');
  });

  it('equinócio de março é Ostara no Norte e Mabon no Sul', () => {
    const at = '2026-03-20T14:46:00Z';
    expect(ofType(year, 'SABBAT').find((s) => minutes(s.at, at) < 5)?.sabbat).toBe('OSTARA');
    expect(ofType(yearSouth, 'SABBAT').find((s) => minutes(s.at, at) < 5)?.sabbat).toBe('MABON');
    expect(ofType(year, 'SABBAT')).toHaveLength(8);
  });
});

describe('estações planetárias de 2026', () => {
  const stations = ofType(year, 'STATION');
  const find = (planet: string, direction: string, near: string) =>
    stations.find((s) => s.planet === planet && s.direction === direction && days(s.at, near) <= 1);

  it.each([
    ['MERCURY', 'RETROGRADE', '2026-02-26'],
    ['MERCURY', 'RETROGRADE', '2026-06-30'],
    ['MERCURY', 'RETROGRADE', '2026-10-24'],
    ['MERCURY', 'DIRECT', '2026-03-21'],
    ['MERCURY', 'DIRECT', '2026-07-24'],
    ['MERCURY', 'DIRECT', '2026-11-14'],
    ['VENUS', 'RETROGRADE', '2026-10-03'],
    ['VENUS', 'DIRECT', '2026-11-14'],
  ])('%s %s ≈ %s', (planet, direction, near) => {
    expect(find(planet, direction, `${near}T12:00:00Z`)).toBeDefined();
  });

  it('Marte não tem estações em 2026; total de 8', () => {
    expect(stations.filter((s) => s.planet === 'MARS')).toHaveLength(0);
    expect(stations).toHaveLength(8);
  });
});

describe('getRetrogradePeriods', () => {
  it('julho de 2026: Mercúrio retrógrado de 30 jun a 24 jul em Caranguejo', () => {
    const periods = getRetrogradePeriods('2026-07-01', '2026-07-31', TZ);
    const mercury = periods.find((p) => p.planet === 'MERCURY');
    expect(mercury).toBeDefined();
    expect(days(`${mercury!.start}T12:00:00Z`, '2026-06-30T12:00:00Z')).toBeLessThanOrEqual(1);
    expect(days(`${mercury!.end}T12:00:00Z`, '2026-07-24T12:00:00Z')).toBeLessThanOrEqual(1);
    expect(mercury!.startSign).toBe('CANCER');
    expect(periods).toHaveLength(1);
  });

  it('agosto de 2026: sem retrógrados', () => {
    expect(getRetrogradePeriods('2026-08-01', '2026-08-31', TZ)).toHaveLength(0);
  });
});

describe('ordenação', () => {
  it('eventos ordenados por instante', () => {
    const sorted = [...year].sort((a, b) => a.at.localeCompare(b.at));
    expect(year).toEqual(sorted);
  });
  it('datas locais dentro do intervalo', () => {
    const may = getSkyEvents('2026-05-01', '2026-05-31', TZ, 'NORTH');
    expect(may.every((e) => e.date >= '2026-05-01' && e.date <= '2026-05-31')).toBe(true);
  });
});
