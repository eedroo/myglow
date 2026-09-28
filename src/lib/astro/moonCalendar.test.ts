import { describe, expect, it } from 'vitest';
import { addDays } from '@/lib/dates';
import { getDailyMoon } from './moon';
import { getMoonCalendar, getMoonEvents } from './moonCalendar';

const TZ = 'Europe/Lisbon';

describe('getMoonCalendar', () => {
  it('coincide com getDailyMoon em todos os dias de maio de 2026', () => {
    const cal = getMoonCalendar('2026-05-01', '2026-05-31', TZ);
    expect(Object.keys(cal)).toHaveLength(31);
    for (let d = '2026-05-01'; d <= '2026-05-31'; d = addDays(d, 1)) {
      const daily = getDailyMoon(d, TZ);
      expect(cal[d], d).toEqual({ phase: daily.phase, sign: daily.signAtNoon });
    }
  });

  it('coincide também noutro fuso (São Paulo, março)', () => {
    const cal = getMoonCalendar('2026-03-01', '2026-03-31', 'America/Sao_Paulo');
    for (let d = '2026-03-01'; d <= '2026-03-31'; d = addDays(d, 1)) {
      const daily = getDailyMoon(d, 'America/Sao_Paulo');
      expect(cal[d], d).toEqual({ phase: daily.phase, sign: daily.signAtNoon });
    }
  });
});

describe('getMoonEvents', () => {
  it('maio de 2026: lua cheia a 1, lua nova a 16', () => {
    const events = getMoonEvents('2026-05-01', '2026-05-31', TZ);
    expect(events).toContainEqual(expect.objectContaining({ phase: 'FULL_MOON', date: '2026-05-01', sign: 'SCORPIO' }));
    expect(events).toContainEqual(expect.objectContaining({ phase: 'NEW_MOON', date: '2026-05-16' }));
    expect(events.every((e) => e.date >= '2026-05-01' && e.date <= '2026-05-31')).toBe(true);
  });
});
