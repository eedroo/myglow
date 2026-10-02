'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { requestEmailChange } from '@/actions/account';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/TextInput';

/** Alterar email: pede a palavra-passe actual; o link de confirmação vai para o email novo. */
export function ChangeEmailForm() {
  const t = useTranslations();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<{ key: string; field?: string } | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(false);
    startTransition(async () => {
      const res = await requestEmailChange({ password, newEmail });
      if (!res.ok) return setError({ key: res.error, field: res.field });
      setError(null);
      setPassword('');
      setSent(true);
    });
  }

  const fieldError = (f: string) => (error?.field === f ? t(error.key) : undefined);
  return (
    <form className="mg-form" onSubmit={onSubmit} noValidate aria-labelledby="change-email-title">
      <h3 id="change-email-title" className="mg-form__title">
        {t('account.changeEmail.title')}
      </h3>
      <Field id="change-email-new" label={t('account.changeEmail.newEmail')} error={fieldError('newEmail')}>
        <TextInput
          id="change-email-new"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={newEmail}
          invalid={!!fieldError('newEmail')}
          onChange={(e) => setNewEmail(e.target.value)}
          required
        />
      </Field>
      <Field id="change-email-password" label={t('account.currentPassword')} error={fieldError('password')}>
        <TextInput
          id="change-email-password"
          type="password"
          autoComplete="current-password"
          value={password}
          invalid={!!fieldError('password')}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      <div className="mg-form__row">
        <Button type="submit" variant="ghost" loading={pending}>
          {t('account.changeEmail.submit')}
        </Button>
      </div>
      {sent && (
        <p className="mg-form__status mg-form__status--ok" role="status">
          {t('account.changeEmail.sent', { email: newEmail })}
        </p>
      )}
      {error && !error.field && (
        <p className="mg-form__status mg-form__status--error" role="alert">
          {t(error.key)}
        </p>
      )}
    </form>
  );
}
