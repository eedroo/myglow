'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DayNavProps {
  label: string; // data longa
  prevHref: string;
  nextHref: string | null; // null quando é hoje
  isToday: boolean;
}

/** ← data longa → ; "Hoje" quando não é hoje; → desactivado em hoje. */
export function DayNav({ label, prevHref, nextHref, isToday }: DayNavProps) {
  const t = useTranslations('day.nav');
  return (
    <nav className="mg-day-nav" aria-label={t('label')}>
      <Link href={prevHref} className="mg-day-nav__btn" aria-label={t('prev')} title={t('prev')}>
        <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
      </Link>
      <div className="mg-day-nav__center">
        <h1 className="mg-day-nav__label">{label}</h1>
        {!isToday && (
          <Link href="/today" className="mg-day-nav__today">
            {t('today')}
          </Link>
        )}
      </div>
      {nextHref ? (
        <Link href={nextHref} className="mg-day-nav__btn" aria-label={t('next')} title={t('next')}>
          <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      ) : (
        <span className="mg-day-nav__btn mg-day-nav__btn--disabled" aria-hidden="true">
          <ChevronRight size={20} strokeWidth={1.5} />
        </span>
      )}
    </nav>
  );
}
