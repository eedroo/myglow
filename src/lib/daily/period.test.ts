import { describe, expect, it } from 'vitest';
import { getDayPeriod } from './period';

describe('getDayPeriod', () => {
  it.each([
    ['2026-05-06T10:59:00Z', 'morning'], // 11:59 Lisboa
    ['2026-05-06T11:00:00Z', 'body'], // 12:00
    ['2026-05-06T16:59:00Z', 'body'], // 17:59
    ['2026-05-06T17:00:00Z', 'night'], // 18:00
    ['2026-05-06T23:30:00Z', 'morning'], // 00:30 do dia seguinte
  ])('%s → %s', (iso, period) => {
    expect(getDayPeriod(new Date(iso), 'Europe/Lisbon')).toBe(period);
  });
});
