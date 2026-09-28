'use client';

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { login, type AuthFormState } from '@/actions/auth';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/TextInput';

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations();
  return (
    <Button type="submit" block loading={pending} loadingLabel={t('common.loading')}>
      {t('auth.login.submit')}
    </Button>
  );
}

export function LoginForm() {
  const t = useTranslations();
  const [state, action] = useFormState<AuthFormState, FormData>(login, {});

  return (
    <form action={action} className="mg-stack" noValidate>
      {state.formError && (
        <p className="mg-form-error" role="alert">
          {t(state.formError)}
        </p>
      )}
      <Field id="login-email" label={t('auth.fields.email')}>
        <TextInput
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t('auth.fields.emailPlaceholder')}
          required
        />
      </Field>
      <Field id="login-password" label={t('auth.fields.password')}>
        <TextInput id="login-password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton />
      <p className="mg-auth__footer">
        {t('auth.login.noAccount')} <Link href="/register">{t('auth.login.registerLink')}</Link>
      </p>
    </form>
  );
}
