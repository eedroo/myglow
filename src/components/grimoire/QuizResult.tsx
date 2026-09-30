'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import type { MagicIconName } from '@/lib/icons';
import { BadgeCeremony } from './BadgeCeremony';

interface QuizResultProps {
  score: number;
  total: number;
  passed: boolean;
  badge?: { name: string; icon: MagicIconName; description: string };
  points: number;
  onRetry: () => void;
}

/** Nota do quiz; passou pela primeira vez → cerimónia do emblema. */
export function QuizResult({ score, total, passed, badge, points, onRetry }: QuizResultProps) {
  const t = useTranslations('grimoire.result');
  return (
    <section className="mg-quiz-result" aria-live="polite">
      <p className="mg-quiz-result__score">{t('score', { score, total })}</p>
      <p className="mg-quiz-result__text">{passed ? t('passed') : t('failed')}</p>
      <div className="mg-quiz-result__actions">
        <Link href="/grimoire" className="mg-btn mg-btn--ghost">
          {t('backToMap')}
        </Link>
        {!passed && <Button onClick={onRetry}>{t('retry')}</Button>}
      </div>
      {passed && badge && <BadgeCeremony badge={badge} points={points} />}
    </section>
  );
}
