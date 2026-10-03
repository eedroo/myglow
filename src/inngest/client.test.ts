import { describe, expect, it } from 'vitest';
import { PROMPT_VERSION } from '@/lib/ai/prompts/system';
import { signFanOut, userEvents } from './client';

describe('eventos de geração', () => {
  it('levam a versão dos prompts (entra na chave de idempotência)', () => {
    const [u] = userEvents('u1', 'PT_BR', [{ kind: 'DAY_PERSONAL', periodStart: '2026-10-03' }]);
    expect(u!.data).toEqual({ userId: 'u1', locale: 'PT_BR', kind: 'DAY_PERSONAL', periodStart: '2026-10-03', version: PROMPT_VERSION });
    expect(signFanOut('MONTH_ENERGY', '2026-11-01').every((e) => e.data.version === PROMPT_VERSION)).toBe(true);
  });
});
