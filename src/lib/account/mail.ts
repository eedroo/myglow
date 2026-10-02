import 'server-only';
import type { Locale } from '@prisma/client';
import { buildEmail, type EmailInput } from '@/emails';
import { sendEmail } from '@/lib/email/send';
import { appUrl } from '@/lib/env';
import { createAuthToken } from '@/lib/auth/tokens';

/** Envia um email de conta na língua do utilizador. Nunca lança (o resultado só é registado). */
type Input = EmailInput extends infer E ? (E extends EmailInput ? Omit<E, 'appUrl'> : never) : never;

export async function sendAccountEmail(to: string, input: Input): Promise<boolean> {
  const { subject, react } = buildEmail({ ...input, appUrl: appUrl() } as EmailInput);
  const { ok } = await sendEmail({ to, subject, react, tag: input.kind });
  return ok;
}

/** Links dos emails (o token vai só no URL do email). */
export const accountLinks = {
  verify: (token: string) => `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`,
  reset: (token: string) => `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`,
  emailChange: (token: string) => `${appUrl()}/confirm-email-change?token=${encodeURIComponent(token)}`,
};

/** Cria o token e envia o email de confirmação (registo e reenvio). Não é uma Server Action. */
export async function sendVerificationEmail(user: { id: string; email: string; name: string; locale: Locale }): Promise<boolean> {
  const token = await createAuthToken(user.id, 'EMAIL_VERIFY');
  return sendAccountEmail(user.email, { kind: 'verify', locale: user.locale, name: user.name, url: accountLinks.verify(token) });
}
