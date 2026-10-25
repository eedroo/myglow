'use client';

import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';
import { formatGramsAsKg } from '@/lib/weight';
import type { RecapSlideProps } from './RecapSlideView';

const SPARK_W = 200;
const SPARK_H = 40;

/** Polilinha do peso normalizada à caixa (a mesma lógica do `PeriodStatsCard`; sem cores de bom/mau). */
function sparkPoints(grams: number[]): { x: number; y: number }[] {
  const min = Math.min(...grams);
  const max = Math.max(...grams);
  const span = max - min || 1;
  return grams.map((g, i) => ({
    x: grams.length === 1 ? SPARK_W / 2 : (i / (grams.length - 1)) * SPARK_W,
    y: SPARK_H - 4 - ((g - min) / span) * (SPARK_H - 8),
  }));
}

/** Água, alongamento e treino; peso como facto, sem juízo. */
export function RecapBody({ slide, locale }: RecapSlideProps<'body'>) {
  const t = useTranslations('recap.body');
  const rows: { key: 'water' | 'stretch' | 'workout'; icon: MagicIconName; done: number }[] = [
    { key: 'water', icon: 'water-drop', done: slide.water.done },
    { key: 'stretch', icon: 'stretch', done: slide.stretch.done },
    { key: 'workout', icon: 'dumbbell', done: slide.workout.done },
  ];
  const points = slide.weight ? sparkPoints(slide.weight.points) : [];
  return (
    <div className="mg-recap-body">
      <h2 className="mg-recap-slide__title">{t('title')}</h2>
      <ul className="mg-recap-list">
        {rows
          .filter((r) => r.done > 0)
          .map((r) => (
            <li key={r.key} className="mg-recap-list__item">
              <MagicIcon name={r.icon} size="md" decorative />
              <span className="mg-recap-list__label">{t(r.key)}</span>
              <span className="mg-recap-list__value">{t('days', { n: r.done })}</span>
            </li>
          ))}
      </ul>
      {slide.weight && (
        <>
          <p className="mg-recap-slide__text">
            {t('weight', { from: formatGramsAsKg(slide.weight.firstGrams, locale), to: formatGramsAsKg(slide.weight.lastGrams, locale) })}
          </p>
          <svg className="mg-recap-body__spark" viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none" role="img" aria-label={t('sparkLabel', { n: points.length })}>
            <polyline className="mg-recap-body__spark-line" points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
            {points.map((p, i) => (
              <circle key={i} className="mg-recap-body__spark-dot" cx={p.x} cy={p.y} r="2" />
            ))}
          </svg>
        </>
      )}
    </div>
  );
}
