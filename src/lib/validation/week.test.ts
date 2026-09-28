import { describe, expect, it } from 'vitest';
import { weekPatchSchema } from './week';

describe('weekPatchSchema', () => {
  it('aceita um patch válido', () => {
    expect(
      weekPatchSchema.safeParse({
        title: 'Recomeço',
        weightGrams: 76400,
        dayNotes: [{ date: '2026-05-05', text: 'Dentista às 10h' }],
        projects: [{ area: 'MAGIC', text: 'Ritual de lua nova' }],
      }).success,
    ).toBe(true);
  });
  it('aceita peso a null', () => {
    expect(weekPatchSchema.safeParse({ weightGrams: null }).success).toBe(true);
  });
  it('rejeita peso não inteiro (gramas)', () => {
    expect(weekPatchSchema.safeParse({ weightGrams: 76.5 }).success).toBe(false);
  });
  it('rejeita peso fora de limites', () => {
    expect(weekPatchSchema.safeParse({ weightGrams: 10_000 }).success).toBe(false);
  });
  it('rejeita chave desconhecida', () => {
    expect(weekPatchSchema.safeParse({ mood: 3 }).success).toBe(false);
  });
  it('rejeita área inválida', () => {
    expect(weekPatchSchema.safeParse({ projects: [{ area: 'HOBBIES', text: 'x' }] }).success).toBe(false);
  });
  it('rejeita patch vazio', () => {
    expect(weekPatchSchema.safeParse({}).success).toBe(false);
  });
});
