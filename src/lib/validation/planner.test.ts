import { describe, expect, it } from 'vitest';
import { monthPatchSchema, yearPatchSchema } from './planner';

describe('monthPatchSchema', () => {
  it('aceita intenção e metas', () => {
    expect(monthPatchSchema.safeParse({ intention: 'x', projects: [{ area: 'MAGIC', text: 'y' }] }).success).toBe(true);
  });
  it('rejeita chave desconhecida e patch vazio', () => {
    expect(monthPatchSchema.safeParse({ word: 'x' }).success).toBe(false);
    expect(monthPatchSchema.safeParse({}).success).toBe(false);
  });
  it('rejeita área inválida', () => {
    expect(monthPatchSchema.safeParse({ projects: [{ area: 'X', text: 'y' }] }).success).toBe(false);
  });
});

describe('yearPatchSchema', () => {
  it('aceita palavra até 40 caracteres (após trim)', () => {
    expect(yearPatchSchema.safeParse({ word: 'a'.repeat(40) }).success).toBe(true);
    expect(yearPatchSchema.safeParse({ word: `  ${'a'.repeat(40)}  ` }).success).toBe(true);
  });
  it('rejeita palavra de 41 caracteres', () => {
    expect(yearPatchSchema.safeParse({ word: 'a'.repeat(41) }).success).toBe(false);
  });
  it('rejeita chave desconhecida', () => {
    expect(yearPatchSchema.safeParse({ title: 'x' }).success).toBe(false);
  });
});
