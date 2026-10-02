import { afterEach, describe, expect, it, vi } from 'vitest';
import { inviteRequired, isValidInvite } from './beta';

describe('códigos de convite', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('sem BETA_INVITE_CODES o registo é aberto', () => {
    vi.stubEnv('BETA_INVITE_CODES', '');
    expect(inviteRequired()).toBe(false);
    expect(isValidInvite('GLOW2026')).toBe(false);
  });

  it('com lista: trim + maiúsculas', () => {
    vi.stubEnv('BETA_INVITE_CODES', 'GLOW2026, amigos');
    expect(inviteRequired()).toBe(true);
    expect(isValidInvite(' glow2026 ')).toBe(true);
    expect(isValidInvite('AMIGOS')).toBe(true);
    expect(isValidInvite('outro')).toBe(false);
    expect(isValidInvite('  ')).toBe(false);
  });
});
