import { getLocale, getTranslations } from 'next-intl/server';
import { formatDateRange, formatLongDate, formatMonthYear, todayInTz } from '@/lib/dates';
import { parseMonthKey } from '@/lib/weeks';
import { isAppLocale } from '@/i18n/locales';
import type { RecapPeriod } from '@/lib/recap/period';
import { getGuideState } from '@/lib/guide/queries';
import { supportContacts } from '@/lib/guide/safety';
import { GuideConsent } from './GuideConsent';
import { GuidePending } from './GuidePending';
import { GuideInsufficient } from './GuideInsufficient';
import { GuideSupport } from './GuideSupport';
import { GuideReportView } from './GuideReportView';
import { GuideFeedback } from './GuideFeedback';
import { GuideRegenerate } from './GuideRegenerate';
import { GuideMarkRead } from './GuideMarkRead';

/** Uma leitura do Guia: cabeçalho e corpo conforme o estado (o acesso já foi verificado pela rota). */
export async function GuidePage({ userId, period, timezone }: { userId: string; period: RecapPeriod; timezone: string }) {
  const [t, rawLocale, state] = await Promise.all([getTranslations('guide'), getLocale(), getGuideState(userId, period.kind, period.key)]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  const name = t('name');
  const isWeek = period.kind === 'WEEK';
  const label = isWeek
    ? t('header.week', { range: formatDateRange(period.from, period.to, locale) })
    : t('header.month', { month: formatMonthYear(parseMonthKey(period.key).year, parseMonthKey(period.key).month, locale) });

  return (
    <article className="mg-guide">
      <header className="mg-guide__header">
        <span className="mg-guide__eyebrow">{label}</span>
        <h1 className="mg-guide__title">{name}</h1>
        {state.status === 'ready' && (
          <span className="mg-guide__meta">
            {t('header.generated', { date: formatLongDate(todayInTz(timezone, new Date(state.generatedAt)), locale) })}
          </span>
        )}
      </header>

      {state.status === 'no-consent' && <GuideConsent />}
      {state.status === 'pending' && <GuidePending kind={period.kind} periodKey={period.key} />}
      {state.status === 'insufficient' && <GuideInsufficient kind={period.kind} periodKey={period.key} />}
      {state.status === 'support' && <GuideSupport contacts={supportContacts(locale)} />}
      {state.status === 'failed' && (
        <div className="mg-guide-empty" role="status">
          <p className="mg-guide-empty__text">{t('failed.text', { name })}</p>
        </div>
      )}
      {state.status === 'ready' && (
        <>
          <GuideMarkRead kind={period.kind} periodKey={period.key} />
          <GuideReportView report={state.report} locale={locale} />
          <GuideFeedback kind={period.kind} periodKey={period.key} initial={state.rating} />
          {state.canRegenerate && <GuideRegenerate kind={period.kind} periodKey={period.key} generatedAt={state.generatedAt} />}
        </>
      )}
    </article>
  );
}
