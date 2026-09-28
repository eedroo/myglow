'use client';

import { useLocale, useTranslations } from 'next-intl';
import { DayProgressDots } from '@/components/ui/DayProgressDots';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { MOON_PHASE_ICON } from '@/components/ui/MoonPhaseStrip';
import { formatLongDate, formatWeekdayShort } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import type { MagicIconName } from '@/lib/icons';
import type { WeekDaySummary } from '@/types/week';

/** Ícone planetário de cada dia, domingo → sábado. */
export const WEEKDAY_ICONS: MagicIconName[] = [
  'sun', 'moon-crescent', 'planet-mars', 'planet-mercury', 'planet-jupiter', 'planet-venus', 'planet-saturn',
];

interface WeekDayRowProps {
  index: number; // 0 = domingo
  day: WeekDaySummary;
  text: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function WeekDayRow({ index, day, text, onChange, onBlur }: WeekDayRowProps) {
  const t = useTranslations();
  const raw = useLocale();
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const longDate = formatLongDate(day.date, locale);
  const id = `week-day-${day.date}`;

  const classes = [
    'mg-week-day',
    day.isToday && 'mg-week-day--today',
    day.isFuture && 'mg-week-day--future',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <span className="mg-week-day__icon">
        <MagicIcon name={WEEKDAY_ICONS[index]!} size="md" decorative />
      </span>
      <label htmlFor={id} className="mg-week-day__head" title={longDate}>
        <span className="mg-week-day__label">{formatWeekdayShort(day.date, locale)}</span>
        <span className="mg-week-day__date">{Number(day.date.slice(8))}</span>
        <span className="mg-week-day__moon">
          <MagicIcon name={MOON_PHASE_ICON[day.moon.phase]} size="sm" label={t(`astro.phases.${day.moon.phase}`)} />
        </span>
        <span className="mg-visually-hidden">{t('week.days.noteLabel', { day: longDate })}</span>
      </label>
      <div className="mg-week-day__text">
        <LinedTextArea
          id={id}
          rows={2}
          maxLength={1000}
          value={text}
          placeholder={t('week.days.notePlaceholder')}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      </div>
      <span className="mg-week-day__progress">
        {!day.isFuture && (
          <DayProgressDots
            progress={day.progress}
            href={day.isToday ? '/today' : `/day/${day.date}`}
            label={`${t('week.days.openDay', { day: longDate })} — ${t('week.progress', {
              morning: day.progress.morning ? 'yes' : 'no',
              bodyChecks: day.progress.bodyChecks,
              night: day.progress.night ? 'yes' : 'no',
            })}`}
          />
        )}
      </span>
    </div>
  );
}
