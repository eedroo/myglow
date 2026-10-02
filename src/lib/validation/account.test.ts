import { describe, expect, it } from 'vitest';
import { registerSchema } from './auth';
import { changeEmailSchema, deleteAccountSchemaFor, resetPasswordSchema } from './account';

const base = { name: 'Ana', email: 'Ana@Example.com', password: 'segredo123', locale: 'PT_PT' as const };

describe('validação da conta', () => {
  it('registo exige termos e consentimento de bem-estar', () => {
    expect(registerSchema.safeParse(base).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, acceptTerms: true }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, acceptTerms: false, wellbeingConsent: true }).success).toBe(false);
    const ok = registerSchema.safeParse({ ...base, acceptTerms: true, wellbeingConsent: true });
    expect(ok.success && ok.data.email).toBe('ana@example.com');
  });

  it('apagar conta: palavra de confirmação na língua', () => {
    expect(deleteAccountSchemaFor('PT_PT').safeParse({ password: 'x', confirmText: 'APAGAR' }).success).toBe(true);
    expect(deleteAccountSchemaFor('PT_BR').safeParse({ password: 'x', confirmText: 'apagar' }).success).toBe(true);
    expect(deleteAccountSchemaFor('PT_PT').safeParse({ password: 'x', confirmText: 'DELETE' }).success).toBe(false);
    expect(deleteAccountSchemaFor('EN').safeParse({ password: 'x', confirmText: 'DELETE' }).success).toBe(true);
    expect(deleteAccountSchemaFor('EN').safeParse({ password: 'x', confirmText: 'APAGA' }).success).toBe(false);
    expect(deleteAccountSchemaFor('EN').safeParse({ password: '', confirmText: 'DELETE' }).success).toBe(false);
  });

  it('nova palavra-passe com 8–72 caracteres e email válido', () => {
    expect(resetPasswordSchema.safeParse({ token: 'a'.repeat(43), password: 'curta' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: 'a'.repeat(43), password: 'comprida1' }).success).toBe(true);
    expect(changeEmailSchema.safeParse({ password: 'x', newEmail: 'nao-e-email' }).success).toBe(false);
  });
});
