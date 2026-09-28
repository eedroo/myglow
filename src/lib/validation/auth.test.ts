import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './auth';

const valid = { name: 'Ana Luz', email: 'ana@example.com', password: 'segredo123', locale: 'PT_PT' };

describe('registerSchema', () => {
  it('aceita um registo válido', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('normaliza email (trim + minúsculas) e nome (trim)', () => {
    const r = registerSchema.parse({ ...valid, email: '  Ana@Example.COM ', name: '  Ana  ' });
    expect(r.email).toBe('ana@example.com');
    expect(r.name).toBe('Ana');
  });

  it.each(['PT_PT', 'PT_BR', 'EN'])('aceita locale %s', (locale) => {
    expect(registerSchema.safeParse({ ...valid, locale }).success).toBe(true);
  });

  it('rejeita nome demasiado curto', () => {
    expect(registerSchema.safeParse({ ...valid, name: ' A ' }).success).toBe(false);
  });

  it('rejeita nome com mais de 60 caracteres', () => {
    expect(registerSchema.safeParse({ ...valid, name: 'a'.repeat(61) }).success).toBe(false);
  });

  it('rejeita email inválido', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'ana@' }).success).toBe(false);
  });

  it('rejeita password com menos de 8 caracteres', () => {
    expect(registerSchema.safeParse({ ...valid, password: '1234567' }).success).toBe(false);
  });

  it('rejeita password com mais de 72 caracteres (limite bcrypt)', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'x'.repeat(73) }).success).toBe(false);
  });

  it('rejeita locale desconhecido', () => {
    expect(registerSchema.safeParse({ ...valid, locale: 'FR' }).success).toBe(false);
  });

  it('rejeita campos em falta', () => {
    expect(registerSchema.safeParse({ email: valid.email }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('aceita credenciais válidas', () => {
    expect(loginSchema.safeParse({ email: 'ana@example.com', password: 'x' }).success).toBe(true);
  });

  it('rejeita password vazia', () => {
    expect(loginSchema.safeParse({ email: 'ana@example.com', password: '' }).success).toBe(false);
  });
});
