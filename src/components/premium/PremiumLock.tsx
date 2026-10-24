'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { registerPremiumInterest } from '@/actions/premium';
import { Button } from '@/components/ui/Button';

interface PremiumLockProps {
  title: string;
  /** Texto curto que não revela o conteúdo. */
  teaser: string;
  /** A pessoa já pediu para ser avisada. */
  interested?: boolean;
}

/** Cadeado premium: sem preços nem compra; só "Quero saber quando abrir". */
export function PremiumLock({ title, teaser, interested = false }: PremiumLockProps) {
  const t = useTranslations('premium');
  const [done, setDone] = useState(interested);
  const [pending, start] = useTransition();
  return (
    <section className="mg-premium-lock" aria-label={t('lockLabel')}>
      <span className="mg-premium-lock__icon" aria-hidden="true">
        <Lock size={24} strokeWidth={1.75} />
      </span>
      <h2 className="mg-premium-lock__title">{title}</h2>
      <p className="mg-premium-lock__text">{teaser}</p>
      {done ? (
        <p className="mg-premium-lock__done" role="status">
          {t('interestDone')}
        </p>
      ) : (
        <Button
          className="mg-premium-lock__cta"
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await registerPremiumInterest();
              if (res.ok) setDone(true);
            })
          }
        >
          {t('interest')}
        </Button>
      )}
    </section>
  );
}
