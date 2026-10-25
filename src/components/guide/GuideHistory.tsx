import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { addDays, formatDateRange, formatMonthYear } from '@/lib/dates';
import { parseMonthKey } from '@/lib/weeks';
import { isAppLocale } from '@/i18n/locales';
import type { GuideHistoryItem } from '@/lib/guide/queries';

/** Leituras anteriores: período, tipo, estado e "por ler". */
export async function GuideHistory({ items }: { items: GuideHistoryItem[] }) {
  const [t, rawLocale] = await Promise.all([getTranslations('guide.history'), getLocale()]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  if (!items.length) return <p>{t('empty')}</p>;
  return (
    <ul className="mg-guide-history">
      {items.map((r) => {
        const isWeek = r.kind === 'WEEK';
        const label = isWeek
          ? t('week', { range: formatDateRange(r.periodKey, addDays(r.periodKey, 6), locale) })
          : t('month', { month: formatMonthYear(parseMonthKey(r.periodKey).year, parseMonthKey(r.periodKey).month, locale) });
        const unread = r.status === 'READY' && !r.readAt;
        return (
          <li key={`${r.kind}-${r.periodKey}`}>
            <Link href={`/guide/${isWeek ? 'week' : 'month'}/${r.periodKey}`} className="mg-guide-history__item">
              <span className="mg-guide-history__text">
                <span>{label}</span>
                <span className="mg-guide-history__status">{t(`status.${r.status}`)}</span>
              </span>
              {unread && <span className="mg-guide-history__unread" role="img" aria-label={t('unread')} />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
