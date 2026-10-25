'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { regenerateGuide } from '@/actions/guide';
import { Button } from '@/components/ui/Button';

const REFRESH_MS = 5_000;
const MAX_MS = 120_000;

/** "Ler de novo com o que escrevi depois": uma vez por período; espera pela leitura nova sem recarregar. */
export function GuideRegenerate({ kind, periodKey, generatedAt }: { kind: 'WEEK' | 'MONTH'; periodKey: string; generatedAt: string }) {
  const t = useTranslations('guide');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A leitura nova muda `generatedAt` (o componente volta a montar sem o botão se já não houver regeneração).
  useEffect(() => {
    if (!waiting) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started >= MAX_MS) {
        window.clearInterval(timer);
        setWaiting(false);
        return;
      }
      router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [waiting, router, generatedAt]);

  return (
    <div className="mg-guide-regen">
      {waiting ? (
        <p className="mg-guide-pending__text" role="status">
          {t(kind === 'WEEK' ? 'pending.week' : 'pending.month', { name: t('name') })}
        </p>
      ) : (
        <Button
          variant="subtle"
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await regenerateGuide(kind, periodKey);
              if (res.ok) setWaiting(true);
              else setError(res.error);
            })
          }
        >
          {t('regen.button')}
        </Button>
      )}
      {error && (
        <p className="mg-guide-consent__note" role="alert">
          {t(error === 'guide.errors.rateLimited' ? 'errors.rateLimited' : 'errors.generic')}
        </p>
      )}
    </div>
  );
}
