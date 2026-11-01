import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { addDays, formatMonthName } from '@/lib/dates';
import { addMonths, monthKey, parseMonthKey } from '@/lib/weeks';
import { isAppLocale } from '@/i18n/locales';
import type { RecapPeriod } from '@/lib/recap/period';
import { getJourney } from '@/lib/journey/server';

/**
 * Depois da retrospectiva e do Guia de um período, o passo seguinte: planear o próximo (semana ou mês) no passo a passo.
 * O mês só aparece com o Mês já desbloqueado na jornada.
 */
export async function GuideNextPlan({ userId, period }: { userId: string; period: RecapPeriod }) {
  const [t, rawLocale, journey] = await Promise.all([getTranslations('guide.next'), getLocale(), getJourney(userId)]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  let href: string;
  let label: string;
  if (period.kind === 'WEEK') {
    href = `/guided/week/${addDays(period.from, 7)}/plan`;
    label = t('week');
  } else {
    if (!journey.planners.has('month')) return null;
    const { year, month } = parseMonthKey(period.key);
    const next = addMonths(year, month, 1);
    href = `/guided/month/${monthKey(next.year, next.month)}/plan`;
    label = t('month', { month: formatMonthName(next.year, next.month, locale) });
  }
  return (
    <section className="mg-guide-next">
      <p className="mg-guide-next__text">{t('text')}</p>
      <Link href={href} className="mg-btn mg-btn--primary mg-btn--block">
        {label}
      </Link>
    </section>
  );
}
