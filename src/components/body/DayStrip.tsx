'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, compareDates, type DateISO } from '@/lib/dates';
import { formatWeekdayShort } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import { TrainingCalendar } from './TrainingCalendar';

/** A semana do dia escolhido (domingo a sábado), com os dias treinados e o calendário. */
export function DayStrip({ date, today, week, trained }: { date: DateISO; today: DateISO; week: { date: DateISO; trained: boolean }[]; trained: DateISO[] }) {
  const t = useTranslations('fitness.day');
  const raw = useLocale();
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const [open, setOpen] = useState(false);
  const prev = addDays(date, -7);
  const next = addDays(date, 7);
  const href = (d: DateISO) => (d === today ? '/body/day' : `/body/day/${d}`);
  return (
    <div className="mg-day-strip">
      <Link className="mg-day-strip__nav" href={href(prev)} aria-label={t('prevWeek')}>
        <ChevronLeft size={20} aria-hidden="true" />
      </Link>
      <nav className="mg-day-strip__days" aria-label={t('week')}>
        {week.map((d) => {
          const cls = ['mg-day-strip__day', d.trained && 'mg-day-strip__day--trained', d.date === date && 'mg-day-strip__day--selected', d.date === today && 'mg-day-strip__day--today']
            .filter(Boolean)
            .join(' ');
          return (
            <Link key={d.date} href={href(d.date)} className={cls} aria-current={d.date === date ? 'date' : undefined} aria-label={d.trained ? t('trainedOn', { day: d.date }) : d.date}>
              <span>{formatWeekdayShort(d.date, locale)}</span>
              <span className="mg-day-strip__num">{Number(d.date.slice(8))}</span>
              <span className="mg-day-strip__dot" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
      {compareDates(next, today) <= 0 ? (
        <Link className="mg-day-strip__nav" href={href(next)} aria-label={t('nextWeek')}>
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
      ) : (
        <span className="mg-day-strip__nav" aria-hidden="true" />
      )}
      <button type="button" className="mg-day-strip__nav" aria-label={t('calendar')} onClick={() => setOpen(true)}>
        <CalendarDays size={20} aria-hidden="true" />
      </button>
      <TrainingCalendar open={open} onClose={() => setOpen(false)} today={today} trained={trained} />
    </div>
  );
}
