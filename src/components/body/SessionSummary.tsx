import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDayMonth, formatLongDate, formatMonthYear } from '@/lib/dates';
import { formatGramsAsKg } from '@/lib/weight';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import type { SessionListItem, SessionSummary as Summary } from '@/lib/fitness/queries';
import { formatClock } from '@/lib/fitness/session';

async function localeTools() {
  const raw = await getLocale();
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  return { locale, kg: (g: number) => formatGramsAsKg(g, intlLocale(locale)) };
}

/** Resumo de uma sessão: números grandes e a lista por exercício. `fresh` anima a entrada ao terminar. */
export async function SessionSummary({ summary, fresh }: { summary: Summary; fresh: boolean }) {
  const [t, { locale, kg }] = await Promise.all([getTranslations('fitness.summary'), localeTools()]);
  const stats: { label: string; value: string; metric?: string }[] = [
    { label: t('duration'), value: formatClock(summary.durationSec), metric: 'time' },
    { label: t('exercises'), value: String(summary.exercises) },
    { label: t('sets'), value: String(summary.sets) },
    { label: t('reps'), value: String(summary.reps), metric: 'reps' },
    ...(summary.volumeGrams > 0 ? [{ label: t('volume'), value: t('kgValue', { kg: kg(summary.volumeGrams) }), metric: 'volume' }] : []),
    ...(summary.avgRestSec != null ? [{ label: t('avgRest'), value: formatClock(summary.avgRestSec).replace(/^0(\d):/, '$1:'), metric: 'time' }] : []),
  ];
  return (
    <section className={`mg-session-summary${fresh ? ' mg-session-summary--fresh' : ''}`} aria-label={t('title')}>
      {fresh && <p className="mg-body-section-title">{t('well')}</p>}
      <p className="mg-session-row__meta">{formatLongDate(summary.date, locale)}</p>
      <ul className="mg-session-summary__stats">
        {stats.map((s) => (
          <li key={s.label} className="mg-session-summary__stat">
            <span className={`mg-session-summary__value${s.metric ? ` mg-metric--${s.metric}` : ''}`}>{s.value}</span>
            <span className="mg-session-summary__label">{s.label}</span>
          </li>
        ))}
      </ul>
      {summary.byExercise.map(({ exercise, sets }) => (
        <div key={exercise.id} className="mg-session-summary__ex">
          <Link href={`/body/exercises/${encodeURIComponent(exercise.id)}`} className="mg-session-row__name">
            {exercise.name}
          </Link>
          <span className="mg-session-row__meta">
            {sets
              .map((s) =>
                s.durationSec != null
                  ? t('secondsShort', { n: s.durationSec })
                  : s.weightGrams != null
                    ? `${t('kgValue', { kg: kg(s.weightGrams) })} × ${s.reps ?? 0}`
                    : String(s.reps ?? 0),
              )
              .join(', ')}
          </span>
        </div>
      ))}
    </section>
  );
}

export async function SessionRow({ session }: { session: SessionListItem }) {
  const [t, { locale }] = await Promise.all([getTranslations('fitness.sessions'), localeTools()]);
  return (
    <Link href={`/body/sessions/${session.id}`} className="mg-session-row">
      <span className="mg-session-row__text">
        <span className="mg-session-row__name">{session.name ?? t('free')}</span>
        <span className="mg-session-row__meta">{t('sets', { n: session.sets })}</span>
      </span>
      <span className="mg-session-row__time">
        {formatDayMonth(session.date, locale)} · {formatClock(session.durationSec)}
      </span>
    </Link>
  );
}

/** Sessões agrupadas por mês, mais recentes primeiro. */
export async function SessionList({ sessions }: { sessions: SessionListItem[] }) {
  const [t, { locale }] = await Promise.all([getTranslations('fitness.sessions'), localeTools()]);
  if (!sessions.length) return <p className="mg-body-empty">{t('empty')}</p>;
  const months = new Map<string, SessionListItem[]>();
  for (const s of sessions) {
    const k = s.date.slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), s]);
  }
  return (
    <>
      {[...months.entries()].map(([k, list]) => (
        <section key={k} aria-label={formatMonthYear(Number(k.slice(0, 4)), Number(k.slice(5, 7)), locale)}>
          <h2 className="mg-body-section-title">{formatMonthYear(Number(k.slice(0, 4)), Number(k.slice(5, 7)), locale)}</h2>
          <ul className="mg-session-list">
            {list.map((s) => (
              <li key={s.id}>
                <SessionRow session={s} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
