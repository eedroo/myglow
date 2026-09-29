import { describe, expect, it } from 'vitest';
import { computeNatalChart } from '@/lib/astro/natal';
import { toBirthUtc } from '@/lib/birth';
import { buildDayFacts, buildPersonalDayFacts, buildPersonalPeriodFacts } from './facts';
import { dayHoroscopeSchema, dayPersonalSchema, monthRitualsSchema } from './schemas';
import { checkSignMentions, validateDayHoroscope, validateDayPersonal, validateMonthRituals } from './validate';
import dayPersonalValid from '../../../tests/fixtures/ai/day-personal.valid.json';
import dayPersonalInvented from '../../../tests/fixtures/ai/day-personal.invented-transit.json';
import ritualsValid from '../../../tests/fixtures/ai/month-rituals.valid.json';
import ritualsInvented from '../../../tests/fixtures/ai/month-rituals.invented-date.json';
import horoscopeValid from '../../../tests/fixtures/ai/day-horoscope.valid.json';

const TZ = 'Europe/Lisbon';
const chart = computeNatalChart({
  birthUtc: toBirthUtc('1990-07-15', '14:30', TZ), latitude: 38.72, longitude: -9.14, timeKnown: true,
  birthDate: '1990-07-15', birthTz: TZ,
});
const day = buildPersonalDayFacts({ date: '2026-05-06', tz: TZ, hemisphere: 'NORTH', chart });
const month = buildPersonalPeriodFacts({ from: '2026-05-01', to: '2026-05-31', tz: TZ, hemisphere: 'NORTH', chart });

describe('validateDayPersonal', () => {
  it('resposta válida passa', () => {
    expect(validateDayPersonal(dayPersonalSchema.parse(dayPersonalValid), day)).toBeNull();
  });

  it('trânsito com label inexistente falha com a razão', () => {
    const reason = validateDayPersonal(dayPersonalSchema.parse(dayPersonalInvented), day);
    expect(reason).toMatch(/PLUTO_SQUARE_NATAL_SUN/);
  });

  it('label inventado citado no texto também falha', () => {
    const data = dayPersonalSchema.parse({ ...dayPersonalValid, reading: 'VENUS_OPPOSITION_NATAL_SUN marca o dia.' });
    expect(validateDayPersonal(data, day)).toMatch(/VENUS_OPPOSITION_NATAL_SUN/);
  });

  it('Lua num signo diferente do dos factos falha', () => {
    const data = dayPersonalSchema.parse({ ...dayPersonalValid, reading: 'Com a Lua em Leão, brilha.' });
    expect(validateDayPersonal(data, day)).toMatch(/LEO/);
  });
});

describe('validateMonthRituals', () => {
  it('resposta válida passa', () => {
    expect(validateMonthRituals(monthRitualsSchema.parse(ritualsValid), month)).toBeNull();
  });

  it('ritual com data fora dos eventos falha', () => {
    expect(validateMonthRituals(monthRitualsSchema.parse(ritualsInvented), month)).toMatch(/2026-05-12/);
  });

  it('ritual fora do mês falha', () => {
    const data = monthRitualsSchema.parse(ritualsValid);
    data.rituals[0]!.date = '2026-06-14';
    expect(validateMonthRituals(data, month)).toMatch(/2026-06-14/);
  });
});

describe('checkSignMentions', () => {
  const shared = { sign: 'CANCER' as const, ...buildDayFacts('2026-05-06', 'UTC', 'NORTH', { shared: true }) };

  it('horóscopo válido passa', () => {
    expect(validateDayHoroscope(dayHoroscopeSchema.parse(horoscopeValid), shared)).toBeNull();
  });

  it('reconhece as três línguas e fases entre o astro e o signo', () => {
    const allowed = { MOON: new Set(['CAPRICORN' as const]), SUN: new Set(['TAURUS' as const]) };
    expect(checkSignMentions('A Lua em Capricórnio e o Sol em Touro.', allowed)).toBeNull();
    expect(checkSignMentions('The Moon in Aries today.', allowed)).toMatch(/ARIES/);
    expect(checkSignMentions('A Lua Nova em Áries chega.', allowed)).toMatch(/ARIES/);
    expect(checkSignMentions('O Sol entra em Gêmeos.', allowed)).toMatch(/GEMINI/);
    expect(checkSignMentions('Sol. Em Gémeos há quem sonhe.', allowed)).toBeNull();
  });
});
