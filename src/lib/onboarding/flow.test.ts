import { describe, expect, it } from 'vitest';
import { nextOnboardingStep } from './flow';

describe('nextOnboardingStep', () => {
  const at = new Date('2026-10-03T10:00:00Z');
  it('sem nascimento → birth; sem apresentação → welcome; ambos → done', () => {
    expect(nextOnboardingStep({ onboardedAt: null, welcomeSeenAt: null })).toBe('birth');
    expect(nextOnboardingStep({ onboardedAt: null, welcomeSeenAt: at })).toBe('birth');
    expect(nextOnboardingStep({ onboardedAt: at, welcomeSeenAt: null })).toBe('welcome');
    expect(nextOnboardingStep({ onboardedAt: at, welcomeSeenAt: at })).toBe('done');
  });
});
