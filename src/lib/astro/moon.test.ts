import { describe, expect, it } from 'vitest';
import { getDailyMoon } from './moon';

const TZ = 'Europe/Lisbon';
const minutesBetween = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60_000;

describe('getDailyMoon (Lisboa)', () => {
  it('2026-05-06: Capricórnio, minguante gibosa, sem ingresso nem evento', () => {
    const m = getDailyMoon('2026-05-06', TZ);
    expect(m.signAtNoon).toBe('CAPRICORN');
    expect(m.phase).toBe('WANING_GIBBOUS');
    expect(m.ingress).toBeNull();
    expect(m.event).toBeNull();
    expect(m.illumination).toBeGreaterThan(0.7);
    expect(m.illumination).toBeLessThan(0.9);
  });

  it('2026-05-08: entra em Aquário ≈ 07:27Z', () => {
    const m = getDailyMoon('2026-05-08', TZ);
    expect(m.signAtNoon).toBe('AQUARIUS');
    expect(m.ingress?.sign).toBe('AQUARIUS');
    expect(minutesBetween(m.ingress!.at, '2026-05-08T07:27:00Z')).toBeLessThan(3);
  });

  it('2026-05-01: lua cheia ≈ 17:24Z', () => {
    const m = getDailyMoon('2026-05-01', TZ);
    expect(m.phase).toBe('FULL_MOON');
    expect(m.event?.phase).toBe('FULL_MOON');
    expect(minutesBetween(m.event!.at, '2026-05-01T17:24:00Z')).toBeLessThan(3);
  });

  it('a lua cheia aparece num só dia', () => {
    expect(getDailyMoon('2026-04-30', TZ).phase).not.toBe('FULL_MOON');
    expect(getDailyMoon('2026-05-02', TZ).phase).not.toBe('FULL_MOON');
  });

  it('2026-05-16: lua nova ≈ 20:02Z', () => {
    const m = getDailyMoon('2026-05-16', TZ);
    expect(m.phase).toBe('NEW_MOON');
    expect(minutesBetween(m.event!.at, '2026-05-16T20:02:00Z')).toBeLessThan(3);
  });
});
