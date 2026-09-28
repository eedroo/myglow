import { describe, expect, it } from 'vitest';
import { dailyPatchSchema } from './daily';

describe('dailyPatchSchema', () => {
  it('rejeita chave desconhecida', () => {
    expect(dailyPatchSchema.safeParse({ hacker: true }).success).toBe(false);
  });
  it('rejeita humor fora da escala', () => {
    expect(dailyPatchSchema.safeParse({ mood: 6 }).success).toBe(false);
    expect(dailyPatchSchema.safeParse({ wakeMood: 0 }).success).toBe(false);
    expect(dailyPatchSchema.safeParse({ mood: 2.5 }).success).toBe(false);
  });
  it('rejeita patch vazio', () => {
    expect(dailyPatchSchema.safeParse({}).success).toBe(false);
  });
  it('aceita { mood: null }', () => {
    expect(dailyPatchSchema.safeParse({ mood: null }).success).toBe(true);
  });
  it('aceita patch misto', () => {
    expect(dailyPatchSchema.safeParse({ intention: 'Calma', morningRitualDone: true, wakeMood: 4 }).success).toBe(true);
  });
  it('rejeita texto demasiado longo', () => {
    expect(dailyPatchSchema.safeParse({ morningBanishName: 'x'.repeat(81) }).success).toBe(false);
  });
});
