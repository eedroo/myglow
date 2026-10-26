'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { giveGuideConsent } from '@/actions/guide';
import { Button } from '@/components/ui/Button';

const ITEMS = ['sent', 'never', 'body', 'who', 'off'] as const;

/** Consentimento do Guia: o que é enviado, o que nunca é, quem processa e como desligar. Desligado por defeito. */
export function GuideConsent() {
  const t = useTranslations('guide.consent');
  const tg = useTranslations('guide');
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const name = tg('name');

  return (
    <section className="mg-guide-consent" aria-labelledby="guide-consent-title">
      <h2 id="guide-consent-title" className="mg-guide-consent__title">{t('title', { name })}</h2>
      <p>{t('intro', { name })}</p>
      <ul className="mg-guide-consent__list">
        {ITEMS.map((k) => (
          <li key={k} className="mg-guide-consent__item">
            <strong>{t(`${k}Title`)}</strong>
            {t(k, { name })}
          </li>
        ))}
      </ul>
      <p className="mg-guide-consent__note">{t('notProfessional', { name })}</p>
      <label className="mg-guide-consent__check">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>{t('check', { name })}</span>
      </label>
      <div className="mg-guide-consent__actions">
        <Button
          disabled={!checked}
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await giveGuideConsent(true);
              if (res.ok) router.refresh();
              else setError(true);
            })
          }
        >
          {t('activate', { name })}
        </Button>
      </div>
      {error && (
        <p className="mg-guide-consent__note" role="alert">
          {tg('errors.generic')}
        </p>
      )}
    </section>
  );
}
