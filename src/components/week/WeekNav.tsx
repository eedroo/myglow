import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

interface WeekNavProps {
  label: string; // "3–9 mai 2026"
  prevHref: string;
  nextHref: string | null; // null além do limite de planeamento
  isCurrent: boolean;
  monthHref: string;
}

/** ← intervalo da semana → ; "Esta semana" e ligação ao mês. */
export async function WeekNav({ label, prevHref, nextHref, isCurrent, monthHref }: WeekNavProps) {
  const t = await getTranslations('week.nav');
  return (
    <nav className="mg-week-nav" aria-label={t('label')}>
      <Link href={prevHref} className="mg-week-nav__btn" aria-label={t('prev')} title={t('prev')}>
        <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
      </Link>
      <div className="mg-week-nav__center">
        <h1 className="mg-week-nav__label">{label}</h1>
        <div className="mg-week-nav__links">
          {!isCurrent && (
            <Link href="/week" className="mg-week-nav__link">
              {t('current')}
            </Link>
          )}
          <Link href={monthHref} className="mg-week-nav__link">
            {t('month')}
          </Link>
        </div>
      </div>
      {nextHref ? (
        <Link href={nextHref} className="mg-week-nav__btn" aria-label={t('next')} title={t('next')}>
          <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      ) : (
        <span className="mg-week-nav__btn mg-week-nav__btn--disabled" aria-hidden="true">
          <ChevronRight size={20} strokeWidth={1.5} />
        </span>
      )}
    </nav>
  );
}
