'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { compareDates, formatDayMonth, fromDbDate, toDbDate, type DateISO } from '@/lib/dates';
import { rangeBounds, rollingAverage, type WeightPoint, type WeightRange } from '@/lib/body/weight';
import { formatGramsAsKg } from '@/lib/weight';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

const W = 340;
const H = 200;
const PAD = { l: 38, r: 8, t: 10, b: 22 };
const DAY = 86_400_000;

/** Marcas "bonitas" (passo 0,1 / 0,2 / 0,5 / 1 / 2 / 5 kg) para 4 a 5 linhas. */
function ticks(min: number, max: number): number[] {
  const span = Math.max(max - min, 200);
  const step = [100, 200, 500, 1000, 2000, 5000, 10000].find((s) => span / s <= 4) ?? 20000;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push(v);
  return out;
}

/** Gráfico do peso: pontos diários, tendência de 7 dias e linha do alvo; toque mostra data e kg. */
export function WeightChart({ points, today, targetGrams }: { points: WeightPoint[]; today: DateISO; targetGrams: number | null }) {
  const t = useTranslations('body.weight');
  const raw = useLocale();
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const kg = (g: number) => formatGramsAsKg(g, intlLocale(locale));
  const [range, setRange] = useState<WeightRange>('M');
  const [active, setActive] = useState<number | null>(null);

  const view = useMemo(() => {
    const { from, to } = rangeBounds(range, today);
    const inRange = (p: WeightPoint) => compareDates(p.date, from) >= 0 && compareDates(p.date, to) <= 0;
    const shown = points.filter(inRange);
    const trend = rollingAverage(points).filter(inRange);
    const all = [...shown.map((p) => p.grams), ...trend.map((p) => p.grams), ...(targetGrams != null ? [targetGrams] : [])];
    const lo = Math.min(...all) - 300;
    const hi = Math.max(...all) + 300;
    const t0 = toDbDate(from).getTime();
    const t1 = toDbDate(to).getTime();
    const x = (d: DateISO) => PAD.l + ((toDbDate(d).getTime() - t0) / Math.max(t1 - t0, DAY)) * (W - PAD.l - PAD.r);
    const y = (g: number) => PAD.t + (1 - (g - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
    const xTicks = [0, 1, 2, 3].map((i) => fromDbDate(new Date(Math.round((t0 + ((t1 - t0) * i) / 3) / DAY) * DAY)));
    return { shown, trend, lo, hi, x, y, xTicks };
  }, [points, range, today, targetGrams]);

  const pick = (clientX: number, rect: DOMRect) => {
    if (!view.shown.length) return;
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    view.shown.forEach((p, i) => {
      if (Math.abs(view.x(p.date) - px) < Math.abs(view.x(view.shown[best]!.date) - px)) best = i;
    });
    setActive(best);
  };

  const cur = active != null ? view.shown[active] : null;
  return (
    <div className="mg-weight-chart">
      <SegmentedControl<WeightRange>
        name="weight-range"
        legend={t('range')}
        hideLegend
        value={range}
        onChange={(v) => {
          setRange(v);
          setActive(null);
        }}
        options={[
          { value: 'M', label: t('rangeM') },
          { value: '6M', label: t('range6M') },
          { value: 'Y', label: t('rangeY') },
        ]}
      />
      {view.shown.length === 0 ? (
        <p className="mg-weight-chart__empty">{t('chartEmpty')}</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={t('chartLabel', { n: view.shown.length })}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerMove={(e) => e.buttons && pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        >
          {ticks(view.lo, view.hi).map((v) => (
            <g key={v}>
              <line className="mg-weight-chart__grid" x1={PAD.l} x2={W - PAD.r} y1={view.y(v)} y2={view.y(v)} />
              <text className="mg-weight-chart__axis" x={PAD.l - 4} y={view.y(v) + 3} textAnchor="end">
                {kg(v)}
              </text>
            </g>
          ))}
          {view.xTicks.map((d, i) => (
            <text key={i} className="mg-weight-chart__axis" x={view.x(d)} y={H - 6} textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}>
              {formatDayMonth(d, locale)}
            </text>
          ))}
          {targetGrams != null && targetGrams > view.lo && targetGrams < view.hi && (
            <line className="mg-weight-chart__goal" x1={PAD.l} x2={W - PAD.r} y1={view.y(targetGrams)} y2={view.y(targetGrams)} />
          )}
          <polyline className="mg-weight-chart__trend" points={view.trend.map((p) => `${view.x(p.date)},${view.y(p.grams)}`).join(' ')} />
          {view.shown.map((p, i) => (
            <circle key={p.date} className={`mg-weight-chart__point${i === active ? ' mg-weight-chart__point--active' : ''}`} cx={view.x(p.date)} cy={view.y(p.grams)} r={i === active ? 5 : 3.5} />
          ))}
        </svg>
      )}
      <p className="mg-weight-chart__tip" aria-live="polite">
        {cur ? t('pointTip', { date: formatDayMonth(cur.date, locale), kg: kg(cur.grams) }) : t('chartHint')}
      </p>
    </div>
  );
}
