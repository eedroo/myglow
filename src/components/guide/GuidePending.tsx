'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { requestGuide } from '@/actions/guide';

const REFRESH_MS = 5_000;
const MAX_MS = 120_000;

interface GuidePendingProps {
  kind: 'WEEK' | 'MONTH';
  periodKey: string;
  /** Regeneração: a leitura já foi pedida, só espera (sem novo pedido). */
  waitOnly?: boolean;
}

/** A preparar: pede a leitura (Inngest) e refresca a cada 5 s durante no máximo 2 min. */
export function GuidePending({ kind, periodKey, waitOnly = false }: GuidePendingProps) {
  const t = useTranslations('guide');
  const router = useRouter();
  const [expired, setExpired] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    if (!waitOnly && !requested.current) {
      requested.current = true;
      void requestGuide(kind, periodKey);
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started >= MAX_MS) {
        window.clearInterval(timer);
        setExpired(true);
        return;
      }
      router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [kind, periodKey, waitOnly, router]);

  const name = t('name');
  return (
    <div className="mg-guide-pending" role="status" aria-live="polite">
      {!expired && <div className="mg-guide-pending__glow" aria-hidden="true" />}
      <p className="mg-guide-pending__text">
        {expired ? t('pending.long', { name }) : t(kind === 'WEEK' ? 'pending.week' : 'pending.month', { name })}
      </p>
    </div>
  );
}
