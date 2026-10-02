import { describe, expect, it } from 'vitest';
import { isSessionValid, shouldRecheck } from './session';

describe('sessões', () => {
  const now = Date.UTC(2026, 9, 2, 12);
  it('shouldRecheck: 4 min → false, 6 min → true, sem data → true', () => {
    expect(shouldRecheck(now - 4 * 60_000, now)).toBe(false);
    expect(shouldRecheck(now - 6 * 60_000, now)).toBe(true);
    expect(shouldRecheck(undefined, now)).toBe(true);
  });

  it('isSessionValid', () => {
    expect(isSessionValid(1, 2)).toBe(false);
    expect(isSessionValid(2, 2)).toBe(true);
    expect(isSessionValid(undefined, 0)).toBe(true);
    expect(isSessionValid(0, null)).toBe(false);
  });
});
