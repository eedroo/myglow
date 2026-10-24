import { describe, expect, it } from 'vitest';
import { buildEntitlements, canUse, effectivePlan } from './entitlements';

const now = new Date('2026-11-02T12:00:00Z');
const yesterday = new Date('2026-11-01T12:00:00Z');

describe('direitos', () => {
  it('effectivePlan: PREMIUM sem fim mantém-se; com fim ontem passa a FREE', () => {
    expect(effectivePlan({ plan: 'PREMIUM', planExpiresAt: null }, now)).toBe('PREMIUM');
    expect(effectivePlan({ plan: 'PREMIUM', planExpiresAt: yesterday }, now)).toBe('FREE');
    expect(effectivePlan({ plan: 'FREE', planExpiresAt: null }, now)).toBe('FREE');
  });

  it('canUse: interruptor global e excepções', () => {
    expect(canUse('guide', { plan: 'PREMIUM', rollout: 'HIDDEN', override: null })).toBe(false);
    expect(canUse('guide', { plan: 'FREE', rollout: 'HIDDEN', override: true })).toBe(true);
    expect(canUse('guide', { plan: 'FREE', rollout: 'PREMIUM', override: null })).toBe(false);
    expect(canUse('guide', { plan: 'PREMIUM', rollout: 'PREMIUM', override: null })).toBe(true);
    expect(canUse('guide', { plan: 'PREMIUM', rollout: 'ALL', override: false })).toBe(false);
    expect(canUse('guide', { plan: 'FREE', rollout: 'ALL', override: null })).toBe(true);
  });

  it('buildEntitlements: sem linha de FeatureFlag usa o defaultRollout (PREMIUM)', () => {
    expect(buildEntitlements({ plan: 'FREE', planExpiresAt: null }, {}, {}, now)).toEqual({
      plan: 'FREE',
      features: { guide: false, 'body-pro': false },
    });
    expect(buildEntitlements({ plan: 'PREMIUM', planExpiresAt: null }, {}, {}, now).features.guide).toBe(true);
    // Excepção por pessoa com a funcionalidade escondida para todos.
    expect(buildEntitlements({ plan: 'FREE', planExpiresAt: null }, { guide: 'HIDDEN' }, { guide: true }, now).features).toEqual({
      guide: true,
      'body-pro': false,
    });
    // Premium expirado conta como grátis.
    expect(buildEntitlements({ plan: 'PREMIUM', planExpiresAt: yesterday }, {}, {}, now).plan).toBe('FREE');
  });
});
