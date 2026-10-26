import { getLocale, getTranslations } from 'next-intl/server';
import { formatGramsAsKg } from '@/lib/weight';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import type { Comparison, SessionExerciseSummary } from '@/lib/fitness/progress';

/** "Comparado com a anterior": séries, reps, volume e kg/rep com seta e % (setas neutras). */
export async function CompareBlock({ comparison }: { comparison: Record<keyof SessionExerciseSummary, Comparison | null> }) {
  const [t, raw] = await Promise.all([getTranslations('fitness.compare'), getLocale()]);
  const loc = intlLocale(isAppLocale(raw) ? raw : 'pt-PT');
  const kg = (g: number) => t('kg', { kg: formatGramsAsKg(g, loc) });
  const rows: { kind: string; key: keyof SessionExerciseSummary; fmt: (n: number) => string }[] = [
    { kind: 'sets', key: 'sets', fmt: String },
    { kind: 'reps', key: 'reps', fmt: String },
    { kind: 'volume', key: 'volumeGrams', fmt: kg },
    { kind: 'kg', key: 'avgWeightPerRepGrams', fmt: kg },
  ];
  const arrow = (d: number) => (d > 0 ? '↑' : d < 0 ? '↓' : '→');
  return (
    <section aria-label={t('title')}>
      <h3 className="mg-body-section-title">{t('title')}</h3>
      <ul className="mg-compare">
        {rows.map(({ kind, key, fmt }) => {
          const c = comparison[key];
          if (!c) return null;
          const delta = `${arrow(c.delta)} ${c.delta > 0 ? '+' : c.delta < 0 ? '−' : ''}${fmt(Math.abs(c.delta))}`;
          return (
            <li key={kind} className={`mg-compare__row mg-compare__row--${kind}`}>
              <span className="mg-compare__bar" aria-hidden="true" />
              <span>{t(`rows.${kind}`)}</span>
              <span className="mg-compare__value">{fmt(c.value)}</span>
              <span className="mg-compare__delta">
                {delta}
                {c.pct != null && ` (${c.pct > 0 ? '+' : ''}${new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }).format(c.pct)} %)`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
