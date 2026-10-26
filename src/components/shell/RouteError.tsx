'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import { RELOAD_KEY, shouldAutoReload } from '@/lib/errors/recover';
import { Button } from '@/components/ui/Button';

function lastReload(): number | null {
  try {
    const v = window.sessionStorage.getItem(RELOAD_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function reload() {
  try {
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // sem armazenamento: recarrega na mesma
  }
  window.location.reload();
}

/** Ecrã de erro dentro do layout. Rede ou versão nova: recarrega sozinho (uma vez por minuto). */
export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('common');
  const router = useRouter();
  useEffect(() => {
    if (shouldAutoReload(error, lastReload(), Date.now())) return reload();
    Sentry.captureException(error);
  }, [error]);
  return (
    <section className="mg-route-error" role="alert">
      <p className="mg-route-error__title">{t('errors.generic')}</p>
      <div className="mg-route-error__actions">
        <Button
          onClick={() => {
            router.refresh();
            reset();
          }}
        >
          {t('retry')}
        </Button>
        <Button variant="ghost" onClick={reload}>
          {t('reloadApp')}
        </Button>
      </div>
    </section>
  );
}
