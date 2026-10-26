import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDeltaKg, formatGramsAsKg } from '@/lib/weight';
import { formatDayMonth } from '@/lib/dates';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import type { WeightPageData } from '@/lib/body/queries';

/** Último peso e média da semana (diferença neutra para a semana anterior) → página do peso. */
export async function BodyWeightCard({ data }: { data: WeightPageData }) {
  const [t, raw] = await Promise.all([getTranslations('body.weight'), getLocale()]);
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const kg = (g: number) => formatGramsAsKg(g, intlLocale(locale));
  return (
    <Link href="/body/weight" className="mg-body-card mg-weight-card">
      <span className="mg-weight-card__label">{t('weekAverage')}</span>
      <span className="mg-weight-card__value">{data.thisWeekAvg != null ? t('kg', { kg: kg(data.thisWeekAvg) }) : '–'}</span>
      {data.thisWeekAvg != null && data.lastWeekAvg != null && (
        <span className="mg-weight-card__delta">{t('vsLastWeek', { delta: formatDeltaKg(data.thisWeekAvg - data.lastWeekAvg, intlLocale(locale)) })}</span>
      )}
      <span className="mg-weight-card__delta">
        {data.last ? t('lastEntry', { kg: kg(data.last.grams), date: formatDayMonth(data.last.date, locale) }) : t('noEntries')}
      </span>
    </Link>
  );
}
