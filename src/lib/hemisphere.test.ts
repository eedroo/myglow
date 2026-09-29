import { describe, expect, it } from 'vitest';
import { guessHemisphere } from './hemisphere';

describe('guessHemisphere', () => {
  it.each([
    ['Europe/Lisbon', 'NORTH'],
    ['America/Sao_Paulo', 'SOUTH'],
    ['America/Boa_Vista', 'NORTH'],
    ['Australia/Sydney', 'SOUTH'],
    ['America/Argentina/Buenos_Aires', 'SOUTH'],
    ['Africa/Luanda', 'SOUTH'],
    ['Pacific/Auckland', 'SOUTH'],
    ['America/New_York', 'NORTH'],
    ['UTC', 'NORTH'],
  ])('%s → %s', (tz, h) => {
    expect(guessHemisphere(tz)).toBe(h);
  });
});
