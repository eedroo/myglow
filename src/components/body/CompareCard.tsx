import { ArrowLeftRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatGramsAsKg } from '@/lib/weight';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import type { Comparison, SessionExerciseSummary } from '@/lib/fitness/progress';

export type ComparisonMap = Record<keyof SessionExerciseSummary, Comparison | null>;

/**
 * "Comparado com a anterior": grelha 2×2 com séries, reps, volume e kg por rep. Cada célula: barra de cor, nome,
 * valor e variação (▲ em verde quando sobe; ▼ e sem mudança neutros, sem castigo).
 */
export function CompareCard({ comparison }: { comparison: ComparisonMap }) {
  const t = useTranslations('fitness.compare');
  const raw = useLocale();
  const loc = intlLocale(isAppLocale(raw) ? raw : 'pt-PT');
  const kg = (g: number) => t('kg', { kg: formatGramsAsKg(g, loc) });
  const pctFmt = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 });
  const cells: { kind: string; key: keyof SessionExerciseSummary; fmt: (n: number) => string }[] = [
    { kind: 'sets', key: 'sets', fmt: String },
    { kind: 'reps', key: 'reps', fmt: String },
    { kind: 'volume', key: 'volumeGrams', fmt: kg },
    { kind: 'kg', key: 'avgWeightPerRepGrams', fmt: kg },
  ];
  const shown = cells.filter((c) => comparison[c.key]);
  if (!shown.length) return null;
  return (
    <section className="mg-compare" aria-label={t('title')}>
      <p className="mg-compare__head">
        <ArrowLeftRight size={16} aria-hidden="true" /> {t('title')}
      </p>
      <dl className="mg-compare__grid">
        {shown.map(({ kind, key, fmt }) => {
          const c = comparison[key]!;
          const up = c.delta > 0;
          const pct = c.pct != null ? ` (${pctFmt.format(Math.abs(c.pct))} %)` : '';
          return (
            <div key={kind} className={`mg-compare__cell mg-compare__cell--${kind}`}>
              <span className="mg-compare__bar" aria-hidden="true" />
              <dt className="mg-compare__label">{t(`rows.${kind}`)}</dt>
              <dd className="mg-compare__value">{fmt(c.value)}</dd>
              <dd className={`mg-compare__delta${up ? ' mg-compare__delta--up' : ''}`}>
                <span aria-hidden="true">{c.delta < 0 ? '▼' : '▲'}</span> {fmt(Math.abs(c.delta))}
                {pct}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
