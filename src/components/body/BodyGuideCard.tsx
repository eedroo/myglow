'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setGuideIncludeBody } from '@/actions/body';
import { Button } from '@/components/ui/Button';

/** Autorização própria para o Guia ler também o corpo (médias, objectivo, treinos). */
export function BodyGuideCard({ enabled }: { enabled: boolean }) {
  const t = useTranslations('body.guide');
  const te = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toggle = (v: boolean) =>
    start(async () => {
      const res = await setGuideIncludeBody(v);
      if (!res.ok) return setError(te(res.error));
      setError(null);
      router.refresh();
    });
  return (
    <section className="mg-body-card mg-goal-card" aria-label={t('title')}>
      <p className="mg-goal-card__line">
        <strong>{t('title')}</strong>
      </p>
      <p className="mg-goal-card__line">{enabled ? t('on') : t('invite')}</p>
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
      <div className="mg-body-sheet__actions">
        {enabled ? (
          <Button variant="ghost" loading={pending} onClick={() => toggle(false)}>
            {t('disable')}
          </Button>
        ) : (
          <Button className="mg-btn--body" loading={pending} onClick={() => toggle(true)}>
            {t('enable')}
          </Button>
        )}
      </div>
    </section>
  );
}
