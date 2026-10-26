'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatDayMonth, type DateISO } from '@/lib/dates';
import { formatGramsAsKg } from '@/lib/weight';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

type Metric = 'weight' | 'e1rm' | 'volume';
const W = 340;
const H = 180;
const PAD = { l: 40, r: 8, t: 10, b: 22 };

/** Evolução por sessão: melhor peso, e1RM ou volume. */
export function ExerciseProgressChart({ sessions }: { sessions: { date: DateISO; bestWeightGrams: number | null; e1rmGrams: number | null; volumeGrams: number }[] }) {
  const t = useTranslations('fitness.progress');
  const raw = useLocale();
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const kg = (g: number) => formatGramsAsKg(g, intlLocale(locale));
  const [metric, setMetric] = useState<Metric>('weight');
  const pts = sessions
    .map((s) => ({ date: s.date, v: metric === 'weight' ? s.bestWeightGrams : metric === 'e1rm' ? s.e1rmGrams : s.volumeGrams }))
    .filter((p): p is { date: DateISO; v: number } => p.v != null && p.v > 0);
  const lo = pts.length ? Math.min(...pts.map((p) => p.v)) : 0;
  const hi = pts.length ? Math.max(...pts.map((p) => p.v)) : 1;
  const pad = Math.max((hi - lo) * 0.1, 500);
  const y = (v: number) => PAD.t + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - PAD.t - PAD.b);
  const x = (i: number) => PAD.l + (pts.length > 1 ? i / (pts.length - 1) : 0.5) * (W - PAD.l - PAD.r);
  return (
    <div className={`mg-ex-chart mg-ex-chart--${metric}`}>
      <SegmentedControl<Metric>
        name="ex-metric"
        legend={t('metric')}
        hideLegend
        value={metric}
        onChange={setMetric}
        options={(['weight', 'e1rm', 'volume'] as const).map((m) => ({ value: m, label: t(m) }))}
      />
      {pts.length < 2 ? (
        <p className="mg-body-empty">{t('notEnough')}</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('label', { metric: t(metric), n: pts.length })}>
          {[lo, (lo + hi) / 2, hi].map((v, i) => (
            <text key={i} className="mg-weight-chart__axis" x={PAD.l - 4} y={y(v) + 3} textAnchor="end">
              {kg(Math.round(v / 100) * 100)}
            </text>
          ))}
          <text className="mg-weight-chart__axis" x={x(0)} y={H - 6}>
            {formatDayMonth(pts[0]!.date, locale)}
          </text>
          <text className="mg-weight-chart__axis" x={x(pts.length - 1)} y={H - 6} textAnchor="end">
            {formatDayMonth(pts[pts.length - 1]!.date, locale)}
          </text>
          <polyline className="mg-ex-chart__line" points={pts.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')} />
          {pts.map((p, i) => (
            <circle key={i} className="mg-ex-chart__dot" cx={x(i)} cy={y(p.v)} r={3}>
              <title>{`${formatDayMonth(p.date, locale)}: ${kg(p.v)} kg`}</title>
            </circle>
          ))}
        </svg>
      )}
    </div>
  );
}
