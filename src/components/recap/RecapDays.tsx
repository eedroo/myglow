'use client';

import { useTranslations } from 'next-intl';
import { formatDayMonth, formatWeekdayShort } from '@/lib/dates';
import { monthGrid } from '@/lib/weeks';
import type { DayLevel } from '@/lib/daily/progress';
import { RecapCountUp } from './RecapCountUp';
import type { RecapSlideProps } from './RecapSlideView';

/** Dias registados: pontos da semana ou mini calendário do mês, nas opacidades de nível. */
export function RecapDays({ slide, kind, locale, preload }: RecapSlideProps<'days'>) {
  const t = useTranslations('recap.days');
  const tl = useTranslations('recap.level');
  const isWeek = kind === 'WEEK';
  const byDate = new Map(slide.levels.map((d) => [d.date, d.level]));
  const dot = (date: string, level: DayLevel) => (
    <span className={`mg-recap-days__dot mg-recap-days__dot--${level}`} role="img" aria-label={tl(level, { date: formatDayMonth(date, locale) })} />
  );
  const first = slide.levels[0]?.date ?? '2000-01-01';
  const [y, m] = first.split('-').map(Number) as [number, number];

  return (
    <div className="mg-recap-days">
      <RecapCountUp value={slide.daysTouched} locale={locale} still={preload} />
      <h2 className="mg-recap-slide__title">{t('title', { n: slide.daysTouched })}</h2>
      {slide.daysComplete > 0 && <p className="mg-recap-slide__text">{t('complete', { n: slide.daysComplete })}</p>}
      {slide.bestStreak > 1 && <p className="mg-recap-slide__text">{t('streak', { n: slide.bestStreak })}</p>}
      {slide.moreThanPrev !== null && (
        <p className="mg-recap-slide__more">{t(isWeek ? 'moreWeek' : 'moreMonth', { n: slide.moreThanPrev })}</p>
      )}
      {isWeek ? (
        <ul className="mg-recap-days__dots" aria-label={t('dotsLabel')}>
          {slide.levels.map((d) => (
            <li key={d.date} className="mg-recap-days__day">
              {dot(d.date, d.level)}
              <span aria-hidden="true">{formatWeekdayShort(d.date, locale)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mg-recap-days__grid mg-recap-days__dots" role="list" aria-label={t('dotsLabel')}>
          {monthGrid(y, m).flat().map((date, i) =>
            date ? (
              <span key={date} role="listitem" className="mg-recap-days__day">
                {dot(date, byDate.get(date) ?? 'empty')}
              </span>
            ) : (
              <span key={`out-${i}`} className="mg-recap-days__day" aria-hidden="true">
                <span className="mg-recap-days__dot mg-recap-days__dot--out" />
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}
