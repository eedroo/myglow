import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  locale: z.enum(['PT_PT', 'PT_BR', 'EN']),
  // F9: Termos + Política e consentimento explícito para dados de bem-estar, ambos obrigatórios.
  acceptTerms: z.literal(true),
  wellbeingConsent: z.literal(true),
});

/** F10: com `BETA_INVITE_CODES` o código de convite é obrigatório (a validade é verificada em `register`). */
export function registerSchemaFor(opts: { inviteRequired: boolean }) {
  return registerSchema.extend({
    inviteCode: opts.inviteRequired ? z.string().trim().min(1).max(40) : z.string().trim().max(40).optional(),
  });
}

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
