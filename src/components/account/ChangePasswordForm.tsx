'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { changePassword } from '@/actions/account';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/TextInput';

/** Alterar a palavra-passe: os outros dispositivos saem; este continua com sessão nova. */
export function ChangePasswordForm() {
  const t = useTranslations();
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<{ key: string; field?: string } | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDone(false);
    startTransition(async () => {
      const res = await changePassword({ current, next });
      if (!res.ok) return setError({ key: res.error, field: res.field });
      setError(null);
      setCurrent('');
      setNext('');
      setDone(true);
      router.refresh();
    });
  }

  const fieldError = (f: string) => (error?.field === f ? t(error.key) : undefined);
  const hint = t('auth.fields.passwordHint');
  return (
    <form className="mg-form" onSubmit={onSubmit} noValidate aria-labelledby="change-password-title">
      <h3 id="change-password-title" className="mg-form__title">
        {t('account.changePassword.title')}
      </h3>
      <Field id="change-password-current" label={t('account.currentPassword')} error={fieldError('current')}>
        <TextInput
          id="change-password-current"
          type="password"
          autoComplete="current-password"
          value={current}
          invalid={!!fieldError('current')}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </Field>
      <Field id="change-password-next" label={t('account.changePassword.next')} hint={hint} error={fieldError('next')}>
        <TextInput
          id="change-password-next"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          value={next}
          invalid={!!fieldError('next')}
          onChange={(e) => setNext(e.target.value)}
          required
        />
      </Field>
      <div className="mg-form__row">
        <Button type="submit" variant="ghost" loading={pending}>
          {t('account.changePassword.submit')}
        </Button>
      </div>
      {done && (
        <p className="mg-form__status mg-form__status--ok" role="status">
          {t('account.changePassword.done')}
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
