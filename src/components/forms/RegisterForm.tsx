'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { register, type AuthFormState } from '@/actions/auth';
import { Button } from '@/components/ui/Button';
import { Field, describedBy } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/TextInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { appToDbLocale, isAppLocale, DB_LOCALES, type DbLocale } from '@/i18n/locales';

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations();
  return (
    <Button type="submit" block loading={pending} loadingLabel={t('common.loading')}>
      {t('auth.register.submit')}
    </Button>
  );
}

interface RegisterFormProps {
  /** F10: aviso de beta (por cima dos consentimentos). */
  betaNotice?: ReactNode;
  /** F10: código de convite obrigatório (`BETA_INVITE_CODES`); `initial` vem de `?convite=`. */
  invite?: { initial: string } | null;
}

export function RegisterForm({ betaNotice, invite }: RegisterFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [state, action] = useFormState<AuthFormState, FormData>(register, {});
  const errors = state.fieldErrors ?? {};
  const err = (key?: string) => (key ? t(key) : undefined);
  const defaultLocale: DbLocale = isAppLocale(locale) ? appToDbLocale(locale) : 'PT_PT';
  const passwordHint = t('auth.fields.passwordHint');

  return (
    <form action={action} className="mg-stack" noValidate>
      {state.formError && (
        <p className="mg-form-error" role="alert">
          {t(state.formError)}
        </p>
      )}
      <Field id="register-name" label={t('auth.fields.name')} error={err(errors.name)}>
        <TextInput
          id="register-name"
          name="name"
          autoComplete="name"
          placeholder={t('auth.fields.namePlaceholder')}
          invalid={!!errors.name}
          aria-describedby={describedBy('register-name', { error: errors.name })}
          required
        />
      </Field>
      <Field id="register-email" label={t('auth.fields.email')} error={err(errors.email)}>
        <TextInput
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t('auth.fields.emailPlaceholder')}
          invalid={!!errors.email}
          aria-describedby={describedBy('register-email', { error: errors.email })}
          required
        />
      </Field>
      <Field
        id="register-password"
        label={t('auth.fields.password')}
        hint={passwordHint}
        error={err(errors.password)}
      >
        <TextInput
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          invalid={!!errors.password}
          aria-describedby={describedBy('register-password', { hint: passwordHint, error: errors.password })}
          required
        />
      </Field>
      <SegmentedControl<DbLocale>
        name="locale"
        legend={t('auth.fields.locale')}
        defaultValue={defaultLocale}
        options={DB_LOCALES.map((value) => ({ value, label: t(`settings.languageOptions.${value}`) }))}
      />
      {invite && (
        <Field id="register-invite" label={t('beta.invite.label')} hint={t('beta.invite.hint')} error={err(errors.inviteCode)}>
          <TextInput
            id="register-invite"
            name="inviteCode"
            defaultValue={invite.initial}
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={40}
            invalid={!!errors.inviteCode}
            aria-describedby={describedBy('register-invite', { hint: t('beta.invite.hint'), error: errors.inviteCode })}
            required
          />
        </Field>
      )}
      {betaNotice}
      <div className="mg-field">
        <label className="mg-checkbox mg-checkbox--top">
          <input type="checkbox" name="acceptTerms" required aria-invalid={!!errors.acceptTerms || undefined} aria-describedby={errors.acceptTerms ? 'register-terms-error' : undefined} />
          <span>
            {t.rich('account.register.acceptTerms', {
              terms: (chunks) => <Link href="/terms" target="_blank">{chunks}</Link>,
              privacy: (chunks) => <Link href="/privacy" target="_blank">{chunks}</Link>,
            })}
          </span>
        </label>
        {errors.acceptTerms && (
          <p id="register-terms-error" className="mg-field__error" role="alert">
            {t(errors.acceptTerms)}
          </p>
        )}
      </div>
      <div className="mg-field">
        <label className="mg-checkbox mg-checkbox--top">
          <input type="checkbox" name="wellbeingConsent" required aria-invalid={!!errors.wellbeingConsent || undefined} aria-describedby={errors.wellbeingConsent ? 'register-wellbeing-error' : undefined} />
          <span>{t('account.register.wellbeingConsent')}</span>
        </label>
        {errors.wellbeingConsent && (
          <p id="register-wellbeing-error" className="mg-field__error" role="alert">
            {t(errors.wellbeingConsent)}
          </p>
        )}
      </div>
      <SubmitButton />
      <p className="mg-auth__footer">
        {t('auth.register.hasAccount')} <Link href="/login">{t('auth.register.loginLink')}</Link>
      </p>
    </form>
  );
}
