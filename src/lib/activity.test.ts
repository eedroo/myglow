import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ db: {} }));
const { shouldTouch } = await import('./activity');

describe('shouldTouch', () => {
  const last = new Date('2026-11-02T01:00:00Z');
  const now = new Date('2026-11-02T12:00:00Z');

  it('Lisboa: 01:00 e 12:00 UTC são o mesmo dia → não grava', () => {
    expect(shouldTouch(last, 'Europe/Lisbon', now)).toBe(false);
  });

  it('São Paulo: 01:00 UTC ainda é dia 1 → grava', () => {
    expect(shouldTouch(last, 'America/Sao_Paulo', now)).toBe(true);
  });

  it('sem actividade anterior → grava', () => {
    expect(shouldTouch(null, 'Europe/Lisbon', now)).toBe(true);
  });
});
