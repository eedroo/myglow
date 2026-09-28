'use client';

import Link from 'next/link';
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

export function RegisterForm() {
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
      <SubmitButton />
      <p className="mg-auth__footer">
        {t('auth.register.hasAccount')} <Link href="/login">{t('auth.register.loginLink')}</Link>
      </p>
    </form>
  );
}
