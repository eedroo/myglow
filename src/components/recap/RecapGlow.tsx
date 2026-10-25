'use client';

import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { LEVELS } from '@/lib/xp/levels';
import type { MagicIconName } from '@/lib/icons';
import { RecapCountUp } from './RecapCountUp';
import type { RecapSlideProps } from './RecapSlideView';

/** Glow ganho no período e a barra do nível. */
export function RecapGlow({ slide, kind, locale, preload }: RecapSlideProps<'glow'>) {
  const t = useTranslations('recap.glow');
  const tg = useTranslations('glow.levels');
  const levelKey = LEVELS.find((l) => l.level === slide.levelAfter)?.key ?? 'seed';
  return (
    <div className="mg-recap-glow">
      <RecapCountUp value={slide.earned} locale={locale} prefix="+" still={preload} />
      <h2 className="mg-recap-slide__title">{t('title', { n: slide.earned })}</h2>
      <p className="mg-recap-slide__text">{t('text')}</p>
      {slide.moreThanPrev !== null && (
        <p className="mg-recap-slide__more">{t(kind === 'WEEK' ? 'moreWeek' : 'moreMonth', { n: slide.moreThanPrev })}</p>
      )}
      <div className="mg-recap-glow__level">
        <MagicIcon name={`level-${slide.levelAfter}` as MagicIconName} size="md" decorative />
        <span>{tg(`${levelKey}.name`)}</span>
      </div>
      <div
        className="mg-recap-glow__bar"
        role="progressbar"
        aria-label={t('progressLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(slide.progress * 100)}
      >
        <div className="mg-recap-glow__fill" style={{ width: `${Math.round(slide.progress * 100)}%` }} />
      </div>
      {slide.levelAfter > slide.levelBefore && (
        <p className="mg-recap-slide__text">{t('levelUp', { level: tg(`${levelKey}.name`) })}</p>
      )}
    </div>
  );
}
