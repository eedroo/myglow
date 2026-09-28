import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatMonthName, type DateISO } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import type { MonthOverview } from '@/lib/month/overview';

interface MonthWeeksListProps {
  year: number;
  month: number;
  weeks: MonthOverview['weeks'];
  currentWeekStart: DateISO;
}

/** Uma linha por semana do mês: título, 1.ª linha da intenção, dias com diário. */
export async function MonthWeeksList({ year, month, weeks, currentWeekStart }: MonthWeeksListProps) {
  const [t, tw, rawLocale] = await Promise.all([getTranslations('month.weeks'), getTranslations('week'), getLocale()]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  const monthName = formatMonthName(year, month, locale);

  return (
    <GlassCard title={t('title')}>
      <ul className="mg-month-weeks">
        {weeks.map((w) => {
          const title = w.title || tw('defaultTitle', { n: w.weekOfMonth, month: monthName });
          const firstLine = w.intention.split('\n').find((l) => l.trim() !== '') ?? '';
          return (
            <li key={w.start}>
              <Link href={w.start === currentWeekStart ? '/week' : `/week/${w.start}`} className="mg-month-weeks__item">
                <span className="mg-month-weeks__title">{title}</span>
                <span
                  className="mg-month-weeks__count"
                  aria-label={t('countLabel', { touched: w.daysTouched, complete: w.daysComplete })}
                >
                  {t('count', { touched: w.daysTouched })}
                </span>
                <span className="mg-month-weeks__intention">{firstLine || t('noIntention')}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
