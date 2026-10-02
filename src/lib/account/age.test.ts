import { describe, expect, it } from 'vitest';
import { isOldEnough } from './age';

describe('isOldEnough', () => {
  it('16 anos feitos no próprio dia', () => {
    expect(isOldEnough('2010-10-01', '2026-09-30', 16)).toBe(false);
    expect(isOldEnough('2010-09-30', '2026-09-30', 16)).toBe(true);
  });

  it('29 de Fevereiro', () => {
    expect(isOldEnough('2008-02-29', '2024-02-28', 16)).toBe(false);
    expect(isOldEnough('2008-02-29', '2024-02-29', 16)).toBe(true);
    expect(isOldEnough('2008-02-29', '2025-02-28', 17)).toBe(true);
  });
});
