import { describe, expect, it } from 'vitest';
import { feedbackSchema } from './feedback';

describe('feedbackSchema', () => {
  it('aceita uma mensagem válida (com trim)', () => {
    const r = feedbackSchema.safeParse({ kind: 'IDEA', message: '  Gostava de um modo escuro mais quente  ', path: '/today' });
    expect(r.success && r.data.message).toBe('Gostava de um modo escuro mais quente');
  });

  it('rejeita mensagem curta, tipo inválido e mensagem longa', () => {
    expect(feedbackSchema.safeParse({ kind: 'BUG', message: 'abcd' }).success).toBe(false);
    expect(feedbackSchema.safeParse({ kind: 'COMPLAINT', message: 'mensagem válida' }).success).toBe(false);
    expect(feedbackSchema.safeParse({ kind: 'OTHER', message: 'a'.repeat(2001) }).success).toBe(false);
    expect(feedbackSchema.safeParse({ kind: 'OTHER', message: 'a'.repeat(2000) }).success).toBe(true);
  });
});
