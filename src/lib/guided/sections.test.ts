import { describe, expect, it } from 'vitest';
import { isSectionAvailable } from './sections';

describe('isSectionAvailable', () => {
  it('sem consentimento de bem-estar: sem sono, como acordei e humor', () => {
    const ctx = { hasWellbeingConsent: false, hasBodyPro: false };
    for (const k of ['sleep', 'wakeMood', 'mood'] as const) expect(isSectionAvailable(k, ctx), k).toBe(false);
    expect(isSectionAvailable('intention', ctx)).toBe(true);
  });
  it('com desbloqueio (Fase 19), só o desbloqueado', () => {
    const ctx = { hasWellbeingConsent: true, hasBodyPro: true, unlocked: new Set(['intention', 'gratitude'] as const) };
    expect(isSectionAvailable('intention', ctx)).toBe(true);
    expect(isSectionAvailable('gratitude', ctx)).toBe(true);
    expect(isSectionAvailable('reflection', ctx)).toBe(false);
    expect(isSectionAvailable('mood', ctx)).toBe(false);
  });
});
