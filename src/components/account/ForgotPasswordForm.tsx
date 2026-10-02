'use client';

import Link from 'next/link';
import { useState, useTransition, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { requestPasswordReset } from '@/actions/account';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/TextInput';

/** Pedido de recuperação: a resposta é sempre a mesma (não revela se o email existe). */
export function ForgotPasswordForm() {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await requestPasswordReset({ email });
      if (!res.ok) return setError(res.error);
      setError(null);
      setSent(true);
    });
  }

  return (
    <form className="mg-auth-form" onSubmit={onSubmit} noValidate>
      <p className="mg-auth-form__intro">{t('account.forgot.subtitle')}</p>
      {sent ? (
        <p className="mg-auth-form__sent" role="status">
          {t('account.forgot.sent')}
        </p>
      ) : (
        <>
          <Field id="forgot-email" label={t('auth.fields.email')} error={error ? t(error) : undefined}>
            <TextInput
              id="forgot-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              invalid={!!error}
              placeholder={t('auth.fields.emailPlaceholder')}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" block loading={pending} loadingLabel={t('common.loading')}>
            {t('account.forgot.submit')}
          </Button>
        </>
      )}
      <p className="mg-auth-form__links">
        <Link href="/login">{t('account.forgot.backToLogin')}</Link>
      </p>
    </form>
  );
}
