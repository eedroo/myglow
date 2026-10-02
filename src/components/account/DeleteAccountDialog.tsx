'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { deleteAccount } from '@/actions/account';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { TextInput } from '@/components/ui/TextInput';

interface DeleteAccountDialogProps {
  /** Palavra a escrever ("APAGAR" / "DELETE"). */
  confirmWord: string;
  /** Mostra a sugestão de exportar antes (não faz sentido no onboarding). */
  showExport?: boolean;
}

/** Zona de perigo: apagar a conta e todos os dados, sem recuperação. */
export function DeleteAccountDialog({ confirmWord, showExport = true }: DeleteAccountDialogProps) {
  const t = useTranslations();
  const ref = useRef<HTMLDialogElement>(null);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<{ key: string; field?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      // Em caso de sucesso a acção termina a sessão e redirecciona para /goodbye.
      const res = await deleteAccount({ password, confirmText });
      if (res && !res.ok) setError({ key: res.error, field: res.field });
    });
  }

  const fieldError = (f: string) => (error?.field === f ? t(error.key) : undefined);
  return (
    <div className="mg-danger">
      <p className="mg-danger__text">{t('account.danger.text')}</p>
      <ul className="mg-danger__list">
        {(t.raw('account.danger.list') as string[]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {showExport && <p className="mg-danger__text">{t('account.danger.exportFirst')}</p>}
      <div>
        <Button variant="danger" onClick={() => ref.current?.showModal()}>
          {t('account.danger.open')}
        </Button>
      </div>

      <dialog ref={ref} className="mg-danger__dialog" aria-labelledby="delete-account-title">
        <form className="mg-danger__confirm" onSubmit={onSubmit} noValidate>
          <h2 id="delete-account-title" className="mg-danger__title">
            {t('account.danger.dialogTitle')}
          </h2>
          <p className="mg-danger__text">{t('account.danger.dialogText')}</p>
          <Field id="delete-password" label={t('account.currentPassword')} error={fieldError('password')}>
            <TextInput
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              invalid={!!fieldError('password')}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Field id="delete-confirm" label={t('account.danger.confirmLabel', { word: confirmWord })} error={fieldError('confirmText')}>
            <TextInput
              id="delete-confirm"
              value={confirmText}
              autoComplete="off"
              autoCapitalize="characters"
              invalid={!!fieldError('confirmText')}
              onChange={(e) => setConfirmText(e.target.value)}
              required
            />
          </Field>
          {error && !error.field && (
            <p className="mg-form-error" role="alert">
              {t(error.key)}
            </p>
          )}
          <div className="mg-danger__actions">
            <Button variant="ghost" onClick={() => ref.current?.close()} disabled={pending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="danger" loading={pending}>
              {t('account.danger.submit')}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
