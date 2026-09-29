import { describe, expect, it } from 'vitest';
import type { BodyKey, NatalChart, NatalBody } from '@/types/astro';
import { findAspects } from './aspects';
import { toZodiacPosition } from './zodiac';

const body = (lon: number): NatalBody => ({ ...toZodiacPosition(lon), retrograde: false, house: null });

function chart(lons: Partial<Record<BodyKey, number>>, asc: number | null = null): NatalChart {
  const keys: BodyKey[] = ['SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE', 'PLUTO'];
  // Pontos não indicados ficam longe (em 200+i*1°) para não gerar aspectos por acaso.
  const bodies = Object.fromEntries(keys.map((k, i) => [k, body(lons[k] ?? 200 + i)])) as Record<BodyKey, NatalBody>;
  return {
    version: 1,
    computedFor: { birthUtc: '1990-01-01T12:00:00Z', latitude: 0, longitude: 0, timeKnown: asc !== null },
    houseSystem: asc !== null ? 'WHOLE_SIGN' : null,
    bodies,
    ascendant: asc !== null ? toZodiacPosition(asc) : null,
    midheaven: null,
    moonSignUncertain: false,
  };
}

// Só o Sol natal num sítio útil; os outros pontos longe de 0–180 dos trânsitos testados.
const far = { MOON: 300, MERCURY: 301, VENUS: 302, MARS: 303 };

describe('findAspects', () => {
  it('Lua a 125° e Sol natal a 3° → trígono com orbe 2.0', () => {
    const aspects = findAspects({ MOON: 125 }, chart({ SUN: 3, ...far })).filter((a) => a.natal === 'SUN');
    expect(aspects).toEqual([{ transit: 'MOON', natal: 'SUN', type: 'TRINE', orb: 2, label: 'MOON_TRINE_NATAL_SUN' }]);
  });

  it('Lua a 10° de conjunção → nenhum (orbe da Lua = 4)', () => {
    expect(findAspects({ MOON: 13 }, chart({ SUN: 3, ...far })).filter((a) => a.natal === 'SUN')).toEqual([]);
  });

  it('o mesmo afastamento com o Sol em trânsito conta (orbe 8)', () => {
    expect(findAspects({ SUN: 10 }, chart({ SUN: 3, ...far }))[0]).toMatchObject({ type: 'CONJUNCTION', orb: 7 });
  });

  it('ASC ignorado sem hora de nascimento; usado com hora', () => {
    expect(findAspects({ MARS: 90 }, chart({ SUN: 250, ...far })).some((a) => a.natal === 'ASC')).toBe(false);
    expect(findAspects({ MARS: 90 }, chart({ SUN: 250, ...far }, 0)).find((a) => a.natal === 'ASC')).toMatchObject({
      type: 'SQUARE',
      orb: 0,
      label: 'MARS_SQUARE_NATAL_ASC',
    });
  });

  it('ordenado por orbe e limitado', () => {
    const all = findAspects({ SUN: 5, VENUS: 61, SATURN: 180 }, chart({ SUN: 0, ...far }), 20).filter((a) => a.natal === 'SUN');
    expect(all.map((a) => a.label)).toEqual([
      'SATURN_OPPOSITION_NATAL_SUN', // orbe 0
      'VENUS_SEXTILE_NATAL_SUN', // orbe 1
      'SUN_CONJUNCTION_NATAL_SUN', // orbe 5
    ]);
    const limited = findAspects({ SUN: 5, VENUS: 61, SATURN: 180 }, chart({ SUN: 0, ...far }), 2);
    expect(limited).toHaveLength(2);
    expect(limited[0]!.orb).toBeLessThanOrEqual(limited[1]!.orb);
  });
});
