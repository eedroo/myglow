'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatMonthYear, formatWeekdayShort, type DateISO } from '@/lib/dates';
import { addMonths, monthGrid, monthOf, weekDays } from '@/lib/weeks';
import { isAppLocale } from '@/i18n/locales';
import { Button } from '@/components/ui/Button';

const MIN_MONTHS = 3;

/** Folha com os meses (do mais recente para trás) e os dias treinados preenchidos. */
export function TrainingCalendar({ open, onClose, today, trained }: { open: boolean; onClose: () => void; today: DateISO; trained: DateISO[] }) {
  const t = useTranslations('fitness.day');
  const raw = useLocale();
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const set = new Set(trained);
  const cur = monthOf(today);
  const oldest = trained.length ? monthOf(trained[trained.length - 1]!) : cur;
  const span = Math.max(MIN_MONTHS, (cur.year - oldest.year) * 12 + (cur.month - oldest.month) + 1);
  const months = Array.from({ length: Math.min(span, 24) }, (_, i) => addMonths(cur.year, cur.month, -i));
  const dows = weekDays('2026-01-04').map((d) => formatWeekdayShort(d, locale));

  return (
    <dialog ref={ref} className="mg-body-sheet mg-train-cal" onClose={onClose} aria-label={t('calendar')}>
      <h2 className="mg-body-sheet__title">{t('calendar')}</h2>
      {open && (
        <div className="mg-train-cal__months">
          {months.map(({ year, month }) => (
            <section key={`${year}-${month}`} className="mg-train-cal__month">
              <h3>{formatMonthYear(year, month, locale)}</h3>
              <div className="mg-train-cal__grid">
                {dows.map((d, i) => (
                  <span key={i} className="mg-train-cal__dow" aria-hidden="true">
                    {d}
                  </span>
                ))}
                {monthGrid(year, month)
                  .flat()
                  .map((d, i) =>
                    d && d <= today ? (
                      <Link
                        key={d}
                        href={d === today ? '/body/day' : `/body/day/${d}`}
                        onClick={onClose}
                        className={['mg-train-cal__day', set.has(d) && 'mg-train-cal__day--trained', d === today && 'mg-train-cal__day--today'].filter(Boolean).join(' ')}
                        aria-label={set.has(d) ? t('trainedOn', { day: d }) : d}
                      >
                        {Number(d.slice(8))}
                      </Link>
                    ) : (
                      <span key={d ?? `x${i}`} className="mg-train-cal__day" aria-hidden="true">
                        {d ? Number(d.slice(8)) : ''}
                      </span>
                    ),
                  )}
              </div>
            </section>
          ))}
        </div>
      )}
      <div className="mg-body-sheet__actions">
        <Button variant="ghost" onClick={onClose}>
          {t('close')}
        </Button>
      </div>
    </dialog>
  );
}
