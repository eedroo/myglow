'use client';

import type { XpSource } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';

interface GlowToastProps {
  points: number;
  /** Fontes ganhas em simultâneo (agrupadas num só toast). */
  sources: XpSource[];
  /** Mostra no fluxo em vez de fixo no ecrã (showcase). */
  inline?: boolean;
}

/** Rótulo principal de um grupo de awards: dia completo ganha a tudo; o bónus de streak junta-se no fim. */
function mainSource(sources: XpSource[]): XpSource {
  if (sources.includes('DAY_COMPLETE')) return 'DAY_COMPLETE';
  return sources.find((s) => s !== 'STREAK_BONUS') ?? 'STREAK_BONUS';
}

/** "+15 Glow · Noite completa". */
export function GlowToast({ points, sources, inline }: GlowToastProps) {
  const t = useTranslations('glow');
  const main = mainSource(sources);
  const labels = [t(`sources.${main}`)];
  if (main !== 'STREAK_BONUS' && sources.includes('STREAK_BONUS')) labels.push(t('sources.STREAK_BONUS'));

  return (
    <div className={inline ? 'mg-glow-toast mg-glow-toast--inline' : 'mg-glow-toast'} role="status" aria-live="polite">
      <span className="mg-glow-toast__icon">
        <MagicIcon name="glow-orb" size="sm" decorative />
      </span>
      <span className="mg-glow-toast__points">{t('points', { points })}</span>
      <span className="mg-glow-toast__label">· {labels.join(' · ')}</span>
    </div>
  );
}
