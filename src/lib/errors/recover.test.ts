import { describe, expect, it } from 'vitest';
import { isRecoverableError, shouldAutoReload } from './recover';

describe('recuperação de erros', () => {
  it('rede e versões antigas recuperam-se recarregando', () => {
    expect(isRecoverableError({ name: 'TypeError', message: 'Load failed' })).toBe(true);
    expect(isRecoverableError({ name: 'ChunkLoadError', message: 'Loading chunk 123 failed.' })).toBe(true);
    expect(isRecoverableError({ message: 'An unexpected response was received from the server.' })).toBe(true);
    expect(isRecoverableError({ name: 'TypeError', message: "Cannot read properties of undefined (reading 'x')" })).toBe(false);
  });
  it('no máximo um recarregamento automático por minuto', () => {
    const e = { message: 'Failed to fetch' };
    expect(shouldAutoReload(e, null, 100_000)).toBe(true);
    expect(shouldAutoReload(e, 70_000, 100_000)).toBe(false);
    expect(shouldAutoReload(e, 30_000, 100_000)).toBe(true);
  });
});
