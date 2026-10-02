import { z } from 'zod';
import type { Locale } from '@prisma/client';

/** Conta (F9): palavra-passe, email, recuperação e apagamento. */
export const passwordSchema = z.string().min(8).max(72);
const email = z.string().trim().toLowerCase().email().max(254);
const token = z.string().min(20).max(200);

export const changePasswordSchema = z.object({ current: z.string().min(1).max(72), next: passwordSchema });
export const changeEmailSchema = z.object({ password: z.string().min(1).max(72), newEmail: email });
export const requestResetSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token, password: passwordSchema });
export const tokenSchema = token;
export const policiesSchema = z.object({ wellbeingConsent: z.boolean() });
export const withdrawWellbeingSchema = z.object({ deleteData: z.boolean() });

/** Palavra a escrever para confirmar o apagamento da conta, na língua do utilizador. */
export const DELETE_CONFIRM_WORD: Record<Locale, string> = { PT_PT: 'APAGAR', PT_BR: 'APAGAR', EN: 'DELETE' };

export function deleteAccountSchemaFor(locale: Locale) {
  return z.object({
    password: z.string().min(1).max(72),
    confirmText: z
      .string()
      .trim()
      .refine((v) => v.toLocaleUpperCase() === DELETE_CONFIRM_WORD[locale], { message: 'confirm' }),
  });
}
