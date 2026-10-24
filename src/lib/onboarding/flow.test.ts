import { describe, expect, it } from 'vitest';
import { nextOnboardingStep } from './flow';

describe('nextOnboardingStep', () => {
  const at = new Date('2026-10-03T10:00:00Z');
  it('sem nascimento → birth; com nascimento → done (a apresentação deu lugar ao guia em /today)', () => {
    expect(nextOnboardingStep({ onboardedAt: null })).toBe('birth');
    // Onboarded sem welcomeSeenAt já não passa por /welcome.
    expect(nextOnboardingStep({ onboardedAt: at })).toBe('done');
  });
});
