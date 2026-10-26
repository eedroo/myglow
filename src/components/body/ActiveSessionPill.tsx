'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { elapsed } from '@/lib/fitness/session';
import { formatClock, useNow } from './useNow';

/** "Sessão em curso · 00:32:10": no mundo do corpo e no Hoje; toca para voltar à sessão. */
export function ActiveSessionPill({ startedAt, hideOn, onlyOn }: { startedAt: string; hideOn?: string; onlyOn?: string }) {
  const t = useTranslations('fitness.session');
  const pathname = usePathname();
  const now = useNow();
  if ((hideOn && pathname === hideOn) || (onlyOn && pathname !== onlyOn)) return null;
  const time = formatClock(elapsed(new Date(startedAt), now));
  return (
    <Link href="/body/session" className="mg-session-pill" aria-label={t('pillLabel', { time })}>
      <span className="mg-session-pill__dot" aria-hidden="true" />
      {t('pill', { time })}
    </Link>
  );
}
