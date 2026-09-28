import { describe, expect, it } from 'vitest';
import { toBirthUtc } from '@/lib/birth';
import { BODY_KEYS, computeNatalChart } from './natal';
import { natalChartSchema } from './natalChartSchema';

const base = { latitude: 38.72, longitude: -9.14, birthDate: '1990-07-15', birthTz: 'Europe/Lisbon' };

describe('computeNatalChart', () => {
  it('sem hora: sem ascendente, meio-do-céu, sistema de casas nem casas', () => {
    const chart = computeNatalChart({ ...base, birthUtc: toBirthUtc('1990-07-15', null, 'Europe/Lisbon'), timeKnown: false });
    expect(chart.ascendant).toBeNull();
    expect(chart.midheaven).toBeNull();
    expect(chart.houseSystem).toBeNull();
    for (const key of BODY_KEYS) expect(chart.bodies[key].house).toBeNull();
    expect(chart.bodies.SUN.sign).toBe('CANCER');
  });

  it('com hora: casas por signo inteiro, 10 corpos, Sol e Lua directos', () => {
    const chart = computeNatalChart({ ...base, birthUtc: toBirthUtc('1990-07-15', '14:30', 'Europe/Lisbon'), timeKnown: true });
    expect(chart.houseSystem).toBe('WHOLE_SIGN');
    expect(Object.keys(chart.bodies)).toHaveLength(10);
    expect(chart.bodies.SUN.retrograde).toBe(false);
    expect(chart.bodies.MOON.retrograde).toBe(false);
    for (const key of BODY_KEYS) {
      const b = chart.bodies[key];
      expect(b.house).toBeGreaterThanOrEqual(1);
      expect(b.house).toBeLessThanOrEqual(12);
      if (b.sign === chart.ascendant!.sign) expect(b.house).toBe(1);
    }
    expect(natalChartSchema.safeParse(chart).success).toBe(true);
  });

  it('marca Lua incerta quando muda de signo no dia de nascimento (hora desconhecida)', () => {
    // 2026-05-08: a Lua entra em Aquário às 07:27Z (ver moon.test.ts).
    const chart = computeNatalChart({
      latitude: 38.72, longitude: -9.14, birthDate: '2026-05-08', birthTz: 'Europe/Lisbon',
      birthUtc: toBirthUtc('2026-05-08', null, 'Europe/Lisbon'), timeKnown: false,
    });
    expect(chart.moonSignUncertain).toBe(true);
  });

  it('detecta planeta retrógrado (Mercúrio retrógrado a 2026-03-05)', () => {
    const chart = computeNatalChart({
      latitude: 38.72, longitude: -9.14, birthDate: '2026-03-05', birthTz: 'Europe/Lisbon',
      birthUtc: new Date('2026-03-05T12:00:00Z'), timeKnown: true,
    });
    expect(chart.bodies.MERCURY.retrograde).toBe(true);
  });
});
