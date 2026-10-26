'use client';

import { useTranslations } from 'next-intl';
import { Trophy } from 'lucide-react';

/** Troféu dourado numa série com recorde; `fresh` anima a entrada (sem animação com movimento reduzido). */
export function PrTrophy({ kinds, fresh = false, size = 18 }: { kinds: string[]; fresh?: boolean; size?: number }) {
  const t = useTranslations('fitness.records');
  if (!kinds.length) return null;
  const label = kinds.map((k) => (t.has(`kinds.${k}`) ? t(`kinds.${k}`) : k)).join(', ');
  return (
    <span className={`mg-pr${fresh ? ' mg-pr--fresh' : ''}`} role="img" aria-label={t('trophy', { kinds: label })} title={label}>
      <Trophy size={size} strokeWidth={2} aria-hidden="true" />
    </span>
  );
}
