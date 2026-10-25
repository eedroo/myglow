import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { formatDateRange, formatMonthYear } from '@/lib/dates';
import { parseMonthKey } from '@/lib/weeks';
import { isAppLocale } from '@/i18n/locales';
import type { RecapPeriod } from '@/lib/recap/period';

interface RecapEntryCardProps {
  period: RecapPeriod;
  /** Ainda sem `RecapView`: ponto dourado "por ver". */
  unseen: boolean;
}

/** Cartão compacto para (re)ver a retrospectiva de uma semana ou mês acabados. */
export async function RecapEntryCard({ period, unseen }: RecapEntryCardProps) {
  const [t, rawLocale] = await Promise.all([getTranslations('recap.entry'), getLocale()]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  const isWeek = period.kind === 'WEEK';
  const label = isWeek
    ? t('week', { range: formatDateRange(period.from, period.to, locale) })
    : t('month', { month: formatMonthYear(parseMonthKey(period.key).year, parseMonthKey(period.key).month, locale) });
  return (
    <Link href={`/recap/${isWeek ? 'week' : 'month'}/${period.key}`} className="mg-recap-entry">
      <span className="mg-recap-entry__icon">
        <MagicIcon name="sparkles" size="md" decorative />
      </span>
      <span className="mg-recap-entry__text">
        <span className="mg-recap-entry__title">{t('title')}</span>
        <span className="mg-recap-entry__period">{label}</span>
      </span>
      {unseen && (
        <span className="mg-recap-entry__dot" role="img" aria-label={t('unseen')} />
      )}
    </Link>
  );
}
