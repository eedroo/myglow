'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { requestAiContent } from '@/actions/ai';
import type { AiRequest } from '@/lib/ai/queries';

const REFRESH_MS = 10_000;
const MAX_MS = 60_000;

/**
 * Conteúdo IA em preparação: pede a geração (assíncrona, via Inngest) e refresca a página a cada 10 s
 * durante no máximo 1 min. O conteúdo aparece sozinho quando fica pronto.
 */
export function ReadingPending({ requests }: { requests: AiRequest[] }) {
  const t = useTranslations('reading');
  const router = useRouter();
  const [expired, setExpired] = useState(false);
  const requested = useRef(false);
  const key = requests.map((r) => `${r.kind}:${r.periodStart}`).join('|');

  useEffect(() => {
    if (!requests.length) return; // pré-visualização (/dev/ui): nada a pedir
    if (!requested.current) {
      requested.current = true;
      for (const r of requests) void requestAiContent(r.kind, r.periodStart);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao montar / quando os pedidos mudam
  }, [key]);

  return (
    <div className="mg-reading__pending" role="status" aria-live="polite">
      <div className="mg-reading__shimmer" aria-hidden="true">
        <span className="mg-reading__line" />
        <span className="mg-reading__line" />
        <span className="mg-reading__line" />
      </div>
      <p className="mg-reading__pending-text">
        <MagicIcon name="crystal-ball" size="sm" decorative />
        {expired ? t('pendingLong') : t('pending')}
      </p>
    </div>
  );
}
