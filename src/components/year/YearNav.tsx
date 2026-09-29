import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

interface YearNavProps {
  year: number;
  prevHref: string | null;
  nextHref: string | null;
  isCurrent: boolean;
}

/** ← ano → ; "Este ano" quando não é o actual. */
export async function YearNav({ year, prevHref, nextHref, isCurrent }: YearNavProps) {
  const t = await getTranslations('year.nav');
  const arrow = (href: string | null, dir: 'prev' | 'next') => {
    const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
    return href ? (
      <Link href={href} className="mg-year-nav__btn" aria-label={t(dir)} title={t(dir)}>
        <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
      </Link>
    ) : (
      <span className="mg-year-nav__btn mg-year-nav__btn--disabled" aria-hidden="true">
        <Icon size={20} strokeWidth={1.5} />
      </span>
    );
  };

  return (
    <nav className="mg-year-nav" aria-label={t('label')}>
      {arrow(prevHref, 'prev')}
      <div className="mg-year-nav__center">
        <h1 className="mg-year-nav__label">{year}</h1>
        {!isCurrent && (
          <Link href="/year" className="mg-year-nav__today">
            {t('current')}
          </Link>
        )}
      </div>
      {arrow(nextHref, 'next')}
    </nav>
  );
}
