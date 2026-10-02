'use client';

import Link from 'next/link';
import { useState, useTransition, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { resetPassword } from '@/actions/account';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/TextInput';

/** Nova palavra-passe a partir do link do email. Token inválido/expirado → pedir outro. */
export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ key: string; field?: string } | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!token) return <InvalidToken />;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await resetPassword({ token, password });
      if (!res.ok) return setError({ key: res.error, field: res.field });
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="mg-auth-form">
        <p className="mg-auth-form__sent" role="status">
          {t('account.reset.done')}
        </p>
        <Link href="/login" className="mg-btn mg-btn--primary mg-btn--block">
          {t('account.reset.login')}
        </Link>
      </div>
    );
  }
  if (error && !error.field) return <InvalidToken />;

  const hint = t('auth.fields.passwordHint');
  return (
    <form className="mg-auth-form" onSubmit={onSubmit} noValidate>
      <p className="mg-auth-form__intro">{t('account.reset.subtitle')}</p>
      <Field id="reset-password" label={t('account.reset.password')} hint={hint} error={error ? t(error.key) : undefined}>
        <TextInput
          id="reset-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          value={password}
          invalid={!!error}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      <Button type="submit" block loading={pending} loadingLabel={t('common.loading')}>
        {t('account.reset.submit')}
      </Button>
    </form>
  );
}

function InvalidToken() {
  const t = useTranslations('account.reset');
  return (
    <div className="mg-auth-form">
      <p className="mg-form-error" role="alert">
        {t('invalid')}
      </p>
      <p className="mg-auth-form__links">
        <Link href="/forgot-password">{t('requestNew')}</Link>
      </p>
    </div>
  );
}
