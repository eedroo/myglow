import { describe, expect, it } from 'vitest';
import type { Locale, MoonPhase, NotificationKind } from '@prisma/client';
import { ZODIAC_ORDER } from '@/lib/astro/zodiac';
import { MAX_BODY, MAX_TITLE, MOON_EMOJI, buildNotification, testNotification } from './content';

const LOCALES: Locale[] = ['PT_PT', 'PT_BR', 'EN'];
const KINDS: NotificationKind[] = [
  'MORNING', 'BODY', 'NIGHT', 'WEEK_START', 'WEEK_END', 'MONTH_START', 'MONTH_END',
  'WEEK_PLAN_LAST', 'WEEK_REFLECTION_LAST', 'MONTH_PLAN_LAST', 'MONTH_REFLECTION_LAST',
];
const PHASES = Object.keys(MOON_EMOJI) as MoonPhase[];
const base = { date: '2026-05-06', tz: 'Europe/Lisbon' };

describe('buildNotification', () => {
  it('títulos ≤ 50 e corpos ≤ 110 em todas as línguas, kinds e variantes, sem truncar', () => {
    for (const locale of LOCALES) {
      for (const kind of KINDS) {
        for (const phase of PHASES) {
          for (const sign of ZODIAC_ORDER) {
            for (const extra of [{}, { ritualToday: 'Libertar com a Lua Cheia de Escorpião' }, { sabbatToday: 'LUGHNASADH' as const }]) {
              const n = buildNotification(kind, { ...base, locale, moon: { phase, sign }, ...extra });
              expect(n.title.length, `${locale} ${kind} ${phase} ${sign}: ${n.title}`).toBeLessThanOrEqual(MAX_TITLE);
              expect(n.body.length).toBeLessThanOrEqual(MAX_BODY);
              expect(n.title.endsWith('…'), n.title).toBe(false);
              expect(n.url).toMatch(/^\/(today|week|month)(\/[\d-]+)?$/);
            }
          }
        }
      }
      const test = testNotification(locale);
      expect(test.title.length).toBeLessThanOrEqual(MAX_TITLE);
    }
  });

  it('emoji certo por fase e texto na língua', () => {
    const n = buildNotification('MORNING', { ...base, locale: 'PT_PT', moon: { phase: 'WAXING_CRESCENT', sign: 'TAURUS' } });
    expect(n.title).toBe('Crescente em Touro 🌒');
    expect(n.body).toBe('Qual é a tua intenção para hoje?');
    expect(buildNotification('NIGHT', { ...base, locale: 'EN', moon: { phase: 'FULL_MOON', sign: 'LIBRA' } }).title).toContain('🌕');
  });

  it('ritual e sabbat do dia mudam o corpo da manhã', () => {
    const moon = { phase: 'NEW_MOON' as const, sign: 'LIBRA' as const };
    expect(buildNotification('MORNING', { ...base, locale: 'PT_BR', moon, ritualToday: 'Semear' }).body).toBe('Hoje tem ritual: Semear');
    expect(buildNotification('MORNING', { ...base, locale: 'EN', moon, sabbatToday: 'SAMHAIN' }).body).toBe("Today is Samhain. What's your intention?");
  });

  it('semana e mês levam à página certa e mostram o Glow', () => {
    const w = buildNotification('WEEK_START', { ...base, locale: 'PT_PT' });
    expect(w.url).toBe('/week');
    expect(w.body).toContain('20 Glow');
    expect(buildNotification('MONTH_END', { ...base, locale: 'EN' }).url).toBe('/month');
  });
});

describe('convites e última chamada', () => {
  const moon = { phase: 'NEW_MOON' as const, sign: 'LIBRA' as const };

  it('manhã com a leitura pronta: título = headline da leitura', () => {
    const n = buildNotification('MORNING', { ...base, locale: 'PT_BR', moon, dayHeadline: 'Coragem com os pés na terra' });
    expect(n.title).toBe('Coragem com os pés na terra');
    expect(n.body).toBe('Sua mensagem do dia está pronta. Qual é a sua intenção?');
    const withRitual = buildNotification('MORNING', { ...base, locale: 'PT_PT', moon, dayHeadline: 'X', ritualToday: 'Semear' });
    expect(withRitual.body).toBe('A tua mensagem do dia está pronta. Hoje há ritual: Semear');
  });

  it('semana e mês com a leitura pronta', () => {
    expect(buildNotification('WEEK_START', { ...base, locale: 'PT_BR', weekHeadline: 'Tema' })).toMatchObject({
      title: 'Tema', body: 'O tema da sua semana chegou. Que tal planejar a semana?', url: '/week',
    });
    expect(buildNotification('MONTH_START', { ...base, locale: 'PT_BR', monthHeadline: 'Mês', monthRituals: 4 }).body).toBe(
      'Seu mês está pronto, com 4 rituais. Defina sua intenção.',
    );
    expect(buildNotification('MONTH_START', { ...base, locale: 'EN', monthHeadline: 'M', monthRituals: 0 }).body).toBe(
      'Your month is ready. Set your intention.',
    );
  });

  it('última chamada da reflexão abre o período anterior', () => {
    expect(buildNotification('WEEK_REFLECTION_LAST', { ...base, locale: 'PT_PT', periodKey: 'W2026-05-03' }).url).toBe('/week/2026-05-03');
    expect(buildNotification('MONTH_REFLECTION_LAST', { ...base, locale: 'PT_PT', periodKey: 'M2026-05' }).url).toBe('/month/2026-05');
    expect(buildNotification('WEEK_PLAN_LAST', { ...base, locale: 'PT_BR' }).body).toContain('20 Glow');
  });
});

