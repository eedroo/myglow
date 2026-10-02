'use server';

import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { auth, signIn, signOut } from '@/auth';
import { db } from '@/lib/db';
import { legalVersions } from '@/lib/env';
import { allowPasswordReset, allowVerificationResend, clientIp } from '@/lib/ratelimit';
import { consumeAuthToken, createAuthToken } from '@/lib/auth/tokens';
import { accountLinks, sendAccountEmail, sendVerificationEmail } from '@/lib/account/mail';
import {
  changeEmailSchema, changePasswordSchema, deleteAccountSchemaFor, policiesSchema, requestResetSchema,
  resetPasswordSchema, tokenSchema, withdrawWellbeingSchema,
} from '@/lib/validation/account';

/**
 * Conta (F9): confirmação de email, recuperação e alteração de palavra-passe, alteração de email, sessões,
 * apagamento e consentimentos. Erros são chaves i18n. Nenhum email falha a acção principal.
 */
export type AccountResult = { ok: true } | { ok: false; error: string; field?: string };

const fail = (error: string, field?: string): AccountResult => ({ ok: false, error, ...(field && { field }) });

async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({ where: { id: session.user.id } });
}

// ─── Confirmação de email ─────────────────────────────────────────────────────────────────────────

export async function resendVerification(): Promise<AccountResult> {
  const user = await currentUser();
  if (!user) return fail('common.errors.unauthorized');
  if (user.emailVerifiedAt) return { ok: true };
  if (!(await allowVerificationResend(user.id))) return fail('account.errors.rateLimited');
  const sent = await sendVerificationEmail(user);
  return sent ? { ok: true } : fail('account.errors.emailFailed');
}

/** Usado pela página /verify-email. */
export async function verifyEmail(token: string): Promise<AccountResult> {
  if (!tokenSchema.safeParse(token).success) return fail('account.errors.invalidToken');
  const row = await consumeAuthToken(token, 'EMAIL_VERIFY');
  if (!row) return fail('account.errors.invalidToken');
  await db.user.updateMany({ where: { id: row.userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
  return { ok: true };
}

// ─── Palavra-passe ────────────────────────────────────────────────────────────────────────────────

/** Resposta sempre igual: nunca revela se o email existe (nem se o pedido foi limitado). */
export async function requestPasswordReset(input: { email: string }): Promise<AccountResult> {
  const parsed = requestResetSchema.safeParse(input);
  if (!parsed.success) return fail('validation.email', 'email');
  const { email } = parsed.data;
  if (!(await allowPasswordReset(email, clientIp(headers())))) return { ok: true };
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, locale: true } });
  if (user) {
    const token = await createAuthToken(user.id, 'PASSWORD_RESET');
    await sendAccountEmail(user.email, { kind: 'reset', locale: user.locale, name: user.name, url: accountLinks.reset(token) });
  }
  return { ok: true };
}

export async function resetPassword(input: { token: string; password: string }): Promise<AccountResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? '');
    return field === 'password' ? fail('validation.passwordLength', 'password') : fail('account.errors.invalidToken');
  }
  // A palavra-passe é validada antes: um valor inválido não gasta o token.
  const row = await consumeAuthToken(parsed.data.token, 'PASSWORD_RESET');
  if (!row) return fail('account.errors.invalidToken');
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await db.user.findUnique({ where: { id: row.userId }, select: { emailVerifiedAt: true } });
  if (!user) return fail('account.errors.invalidToken');
  const updated = await db.user.update({
    where: { id: row.userId },
    // Abriu o link do email: prova de acesso → fica confirmado.
    data: { passwordHash, sessionVersion: { increment: 1 }, ...(!user.emailVerifiedAt && { emailVerifiedAt: new Date() }) },
    select: { email: true, name: true, locale: true },
  });
  await sendAccountEmail(updated.email, { kind: 'password-changed', locale: updated.locale, name: updated.name });
  return { ok: true };
}

export async function changePassword(input: { current: string; next: string }): Promise<AccountResult> {
  const user = await currentUser();
  if (!user) return fail('common.errors.unauthorized');
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.some((i) => i.path[0] === 'next')
      ? fail('validation.passwordLength', 'next')
      : fail('account.errors.wrongPassword', 'current');
  }
  if (!(await bcrypt.compare(parsed.data.current, user.passwordHash))) return fail('account.errors.wrongPassword', 'current');

  const passwordHash = await bcrypt.hash(parsed.data.next, 12);
  await db.user.update({ where: { id: user.id }, data: { passwordHash, sessionVersion: { increment: 1 } } });
  await sendAccountEmail(user.email, { kind: 'password-changed', locale: user.locale, name: user.name });
  // Os outros dispositivos saem; este recebe já uma sessão nova (com a nova sessionVersion).
  await signIn('credentials', { email: user.email, password: parsed.data.next, redirect: false });
  return { ok: true };
}

// ─── Email ────────────────────────────────────────────────────────────────────────────────────────

export async function requestEmailChange(input: { password: string; newEmail: string }): Promise<AccountResult> {
  const user = await currentUser();
  if (!user) return fail('common.errors.unauthorized');
  const parsed = changeEmailSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.some((i) => i.path[0] === 'newEmail')
      ? fail('validation.email', 'newEmail')
      : fail('account.errors.wrongPassword', 'password');
  }
  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) return fail('account.errors.wrongPassword', 'password');
  const { newEmail } = parsed.data;
  if (newEmail === user.email) return fail('account.errors.sameEmail', 'newEmail');
  const taken = await db.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  if (taken) return fail('auth.errors.emailTaken', 'newEmail');

  const token = await createAuthToken(user.id, 'EMAIL_CHANGE', newEmail);
  const sent = await sendAccountEmail(newEmail, {
    kind: 'email-change-confirm', locale: user.locale, name: user.name, newEmail, url: accountLinks.emailChange(token),
  });
  return sent ? { ok: true } : fail('account.errors.emailFailed');
}

/** Usado pela página /confirm-email-change. */
export async function confirmEmailChange(token: string): Promise<AccountResult> {
  if (!tokenSchema.safeParse(token).success) return fail('account.errors.invalidToken');
  const row = await consumeAuthToken(token, 'EMAIL_CHANGE');
  if (!row?.newEmail) return fail('account.errors.invalidToken');
  const user = await db.user.findUnique({ where: { id: row.userId }, select: { email: true, name: true, locale: true } });
  if (!user) return fail('account.errors.invalidToken');
  const taken = await db.user.findUnique({ where: { email: row.newEmail }, select: { id: true } });
  if (taken) return fail('account.errors.emailNoLongerFree');
  try {
    await db.user.update({
      where: { id: row.userId },
      data: { email: row.newEmail, emailVerifiedAt: new Date(), sessionVersion: { increment: 1 } },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return fail('account.errors.emailNoLongerFree');
    throw err;
  }
  await sendAccountEmail(user.email, { kind: 'email-changed-notice', locale: user.locale, name: user.name, newEmail: row.newEmail });
  return { ok: true };
}

// ─── Sessões e apagamento ─────────────────────────────────────────────────────────────────────────

export async function signOutEverywhere(): Promise<void> {
  const session = await auth();
  if (session?.user?.id) {
    await db.user.updateMany({ where: { id: session.user.id }, data: { sessionVersion: { increment: 1 } } });
  }
  await signOut({ redirectTo: '/login' });
}

export async function deleteAccount(input: { password: string; confirmText: string }): Promise<AccountResult> {
  const user = await currentUser();
  if (!user) return fail('common.errors.unauthorized');
  const parsed = deleteAccountSchemaFor(user.locale).safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.some((i) => i.path[0] === 'confirmText')
      ? fail('account.errors.confirmText', 'confirmText')
      : fail('account.errors.wrongPassword', 'password');
  }
  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) return fail('account.errors.wrongPassword', 'password');

  const { email, name, locale } = user;
  // Remoção imediata: todas as relações estão em onDelete: Cascade.
  await db.user.delete({ where: { id: user.id } });
  await sendAccountEmail(email, { kind: 'account-deleted', locale, name });
  await signOut({ redirectTo: '/goodbye' });
  return { ok: true };
}

// ─── Consentimentos ───────────────────────────────────────────────────────────────────────────────

/** Aceita as versões actuais dos Termos e da Política (e, se marcado, o consentimento de bem-estar). */
export async function acceptCurrentPolicies(input: { wellbeingConsent: boolean }): Promise<AccountResult> {
  const user = await currentUser();
  if (!user) return fail('common.errors.unauthorized');
  const parsed = policiesSchema.safeParse(input);
  if (!parsed.success) return fail('common.errors.generic');
  const { terms, privacy } = legalVersions();
  const now = new Date();
  await db.user.update({
    where: { id: user.id },
    data: {
      termsVersion: terms,
      privacyVersion: privacy,
      termsAcceptedAt: now,
      ...(parsed.data.wellbeingConsent && !user.wellbeingConsentAt && { wellbeingConsentAt: now }),
    },
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function grantWellbeingConsent(): Promise<AccountResult> {
  const user = await currentUser();
  if (!user) return fail('common.errors.unauthorized');
  if (!user.wellbeingConsentAt) await db.user.update({ where: { id: user.id }, data: { wellbeingConsentAt: new Date() } });
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Retira o consentimento; com `deleteData` apaga humor, notas ao acordar, sono e peso já registados. */
export async function withdrawWellbeingConsent(input: { deleteData: boolean }): Promise<AccountResult> {
  const user = await currentUser();
  if (!user) return fail('common.errors.unauthorized');
  const parsed = withdrawWellbeingSchema.safeParse(input);
  if (!parsed.success) return fail('common.errors.generic');
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { wellbeingConsentAt: null } }),
    ...(parsed.data.deleteData
      ? [
          db.dailyEntry.updateMany({ where: { userId: user.id }, data: { wakeMood: null, wakeNote: null, mood: null, sleepGoalMet: false } }),
          db.week.updateMany({ where: { userId: user.id }, data: { weightGrams: null } }),
        ]
      : []),
  ]);
  revalidatePath('/', 'layout');
  return { ok: true };
}
