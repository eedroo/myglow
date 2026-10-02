'use server';

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';
import { db } from '@/lib/db';
import { loginSchema, registerSchema } from '@/lib/validation/auth';
import { legalVersions } from '@/lib/env';
import { sendVerificationEmail } from '@/lib/account/mail';
import { LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, dbToAppLocale, type DbLocale } from '@/i18n/locales';

/** Estado devolvido aos formulários. Erros são chaves i18n (namespace completo, ex.: `validation.email`). */
export interface AuthFormState {
  formError?: string;
  fieldErrors?: Partial<Record<'name' | 'email' | 'password' | 'locale' | 'acceptTerms' | 'wellbeingConsent', string>>;
}

const REGISTER_FIELD_ERRORS = {
  name: 'validation.nameLength',
  email: 'validation.email',
  password: 'validation.passwordLength',
  locale: 'validation.required',
  acceptTerms: 'account.errors.acceptTerms',
  wellbeingConsent: 'account.errors.wellbeingConsent',
} as const;

function setLocaleCookie(locale: DbLocale) {
  cookies().set(LOCALE_COOKIE, dbToAppLocale(locale), LOCALE_COOKIE_OPTIONS);
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    locale: formData.get('locale'),
    acceptTerms: formData.get('acceptTerms') === 'on',
    wellbeingConsent: formData.get('wellbeingConsent') === 'on',
  });

  if (!parsed.success) {
    const fieldErrors: AuthFormState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof typeof REGISTER_FIELD_ERRORS;
      if (field in REGISTER_FIELD_ERRORS) fieldErrors[field] = REGISTER_FIELD_ERRORS[field];
    }
    return { fieldErrors };
  }

  const { name, email, password, locale } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { fieldErrors: { email: 'auth.errors.emailTaken' } };

  const passwordHash = await bcrypt.hash(password, 12);
  const { terms, privacy } = legalVersions();
  const now = new Date();
  let userId: string;
  try {
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        locale,
        termsAcceptedAt: now,
        termsVersion: terms,
        privacyVersion: privacy,
        wellbeingConsentAt: now,
        notificationPrefs: { create: {} },
      },
      select: { id: true },
    });
    userId = user.id;
  } catch {
    // Corrida no unique(email) entre a verificação e a criação.
    return { fieldErrors: { email: 'auth.errors.emailTaken' } };
  }

  // Confirmação de email: não bloqueia o uso; uma falha no envio só fica registada.
  await sendVerificationEmail({ id: userId, email, name, locale });

  setLocaleCookie(locale);
  // Lança NEXT_REDIRECT → /onboarding (o middleware obriga ao onboarding de qualquer forma).
  await signIn('credentials', { email, password, redirectTo: '/onboarding' });
  return {};
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { formError: 'auth.errors.invalidCredentials' };

  try {
    await signIn('credentials', { ...parsed.data, redirect: false });
  } catch (error) {
    // Nunca revelar se o email existe: qualquer falha de credenciais tem a mesma mensagem.
    if (error instanceof AuthError) return { formError: 'auth.errors.invalidCredentials' };
    throw error;
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { locale: true, onboardedAt: true },
  });
  if (user) setLocaleCookie(user.locale);

  redirect(user?.onboardedAt ? '/today' : '/onboarding');
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
