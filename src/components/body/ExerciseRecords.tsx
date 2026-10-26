import { getLocale, getTranslations } from 'next-intl/server';
import { Trophy } from 'lucide-react';
import { formatLongDate } from '@/lib/dates';
import { formatGramsAsKg } from '@/lib/weight';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import type { ExerciseProgress } from '@/lib/body/queries';

/** Melhor peso, melhor e1RM e máx. reps por peso, com as datas. */
export async function ExerciseRecords({ records }: { records: ExerciseProgress['records'] }) {
  const [t, raw] = await Promise.all([getTranslations('fitness.records'), getLocale()]);
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const kg = (g: number) => formatGramsAsKg(g, intlLocale(locale));
  if (!records.weight && !records.e1rm && !records.repsAtWeight.length) return <p className="mg-body-empty">{t('empty')}</p>;
  const row = (label: string, value: string, date: string) => (
    <li key={label} className="mg-ex-records__row">
      <span>{label}</span>
      <span className="mg-ex-records__value">
        <span className="mg-pr" aria-hidden="true">
          <Trophy size={16} />
        </span>
        {value}
        <span className="mg-ex-records__date">{formatLongDate(date, locale)}</span>
      </span>
    </li>
  );
  return (
    <ul className="mg-ex-records">
      {records.weight && row(t('bestWeight'), t('kg', { kg: kg(records.weight.grams) }), records.weight.date)}
      {records.e1rm && row(t('bestE1rm'), t('kg', { kg: kg(records.e1rm.grams) }), records.e1rm.date)}
      {records.repsAtWeight.map((r) =>
        row(r.weightGrams ? t('repsAt', { kg: kg(r.weightGrams) }) : t('repsBody'), t('reps', { n: r.reps }), r.date),
      )}
    </ul>
  );
}
