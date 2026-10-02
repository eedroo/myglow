'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { grantWellbeingConsent, withdrawWellbeingConsent } from '@/actions/account';
import { Button } from '@/components/ui/Button';

interface WellbeingConsentCardProps {
  /** Data já formatada do consentimento, ou null sem consentimento. */
  consentedOn: string | null;
}

/** Consentimento explícito para humor, sono e peso: ver, retirar (com opção de apagar) ou dar. */
export function WellbeingConsentCard({ consentedOn }: WellbeingConsentCardProps) {
  const t = useTranslations('account.wellbeing');
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleteData, setDeleteData] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      setConfirming(false);
      setDeleteData(false);
      router.refresh();
    });

  return (
    <div className="mg-form" id="wellbeing-consent">
      <h3 className="mg-form__title">{t('title')}</h3>
      <p className="mg-form__status">{t('text')}</p>
      {consentedOn ? (
        <>
          <p className="mg-form__status mg-form__status--ok">{t('givenOn', { date: consentedOn })}</p>
          {confirming ? (
            <div className="mg-form" role="group" aria-label={t('withdrawTitle')}>
              <p className="mg-form__status mg-form__status--error">{t('withdrawText')}</p>
              <label className="mg-checkbox mg-checkbox--top">
                <input type="checkbox" checked={deleteData} onChange={(e) => setDeleteData(e.target.checked)} />
                <span>{t('deleteData')}</span>
              </label>
              <div className="mg-form__row">
                <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
                  {t('cancel')}
                </Button>
                <Button variant="danger" loading={pending} onClick={() => run(() => withdrawWellbeingConsent({ deleteData }))}>
                  {t('confirmWithdraw')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mg-form__row">
              <Button variant="subtle" onClick={() => setConfirming(true)}>
                {t('withdraw')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mg-form__status">{t('none')}</p>
          <div className="mg-form__row">
            <Button variant="ghost" loading={pending} onClick={() => run(() => grantWellbeingConsent())}>
              {t('grant')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
