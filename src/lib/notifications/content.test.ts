import { describe, expect, it } from 'vitest';
import type { Locale, MoonPhase, NotificationKind } from '@prisma/client';
import { ZODIAC_ORDER } from '@/lib/astro/zodiac';
import { MAX_BODY, MAX_TITLE, MOON_EMOJI, buildNotification, testNotification } from './content';

const LOCALES: Locale[] = ['PT_PT', 'PT_BR', 'EN'];
const KINDS: NotificationKind[] = ['MORNING', 'BODY', 'NIGHT', 'WEEK_START', 'WEEK_END', 'MONTH_START', 'MONTH_END'];
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
              expect(n.url).toMatch(/^\/(today|week|month)$/);
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
