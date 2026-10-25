'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { requestGuide } from '@/actions/guide';
import { Button } from '@/components/ui/Button';

/** Depois de escrever mais: pede de novo a leitura de um período que tinha poucos dias. */
export function GuideRetry({ kind, periodKey }: { kind: 'WEEK' | 'MONTH'; periodKey: string }) {
  const t = useTranslations('guide');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        variant="ghost"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await requestGuide(kind, periodKey);
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        {t('insufficient.retry')}
      </Button>
      {error && (
        <p className="mg-guide-consent__note" role="alert">
          {t(error === 'guide.errors.rateLimited' ? 'errors.rateLimited' : 'errors.generic')}
        </p>
      )}
    </>
  );
}
