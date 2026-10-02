'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { acceptCurrentPolicies } from '@/actions/account';
import { Button } from '@/components/ui/Button';

interface PolicyUpdateDialogProps {
  /** Sem consentimento de bem-estar → mostra também a caixa (opcional). */
  askWellbeing: boolean;
}

/** Bloqueante: nova versão (ou primeira aceitação) dos Termos e da Política. Não fecha com Esc. */
export function PolicyUpdateDialog({ askWellbeing }: PolicyUpdateDialogProps) {
  const t = useTranslations('account.policy');
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [wellbeing, setWellbeing] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  const accept = () =>
    startTransition(async () => {
      const res = await acceptCurrentPolicies({ wellbeingConsent: askWellbeing && wellbeing });
      if (!res.ok) return setError(true);
      ref.current?.close();
      router.refresh();
    });

  return (
    <dialog
      ref={ref}
      className="mg-policy-dialog"
      aria-labelledby="policy-title"
      aria-describedby="policy-text"
      onCancel={(e) => e.preventDefault()}
    >
      <div className="mg-policy-dialog__body">
        <h2 id="policy-title" className="mg-policy-dialog__title">
          {t('title')}
        </h2>
        <p id="policy-text" className="mg-policy-dialog__text">
          {t('text')}
        </p>
        <ul className="mg-policy-dialog__links">
          <li>
            <Link href="/terms" target="_blank">
              {t('terms')}
            </Link>
          </li>
          <li>
            <Link href="/privacy" target="_blank">
              {t('privacy')}
            </Link>
          </li>
        </ul>
        {askWellbeing && (
          <label className="mg-checkbox mg-checkbox--top mg-policy-dialog__consent">
            <input type="checkbox" checked={wellbeing} onChange={(e) => setWellbeing(e.target.checked)} />
            <span>{t('wellbeing')}</span>
          </label>
        )}
        {error && (
          <p className="mg-form-error" role="alert">
            {t('error')}
          </p>
        )}
        <div className="mg-policy-dialog__actions">
          <Button onClick={accept} loading={pending} autoFocus>
            {t('accept')}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
