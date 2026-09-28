import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

interface MonthNavProps {
  label: string; // "Maio de 2026"
  prevHref: string | null;
  nextHref: string | null;
  isCurrent: boolean;
}

/** ← mês → ; "Este mês" quando não é o actual. */
export async function MonthNav({ label, prevHref, nextHref, isCurrent }: MonthNavProps) {
  const t = await getTranslations('month.nav');
  const arrow = (href: string | null, dir: 'prev' | 'next') => {
    const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
    return href ? (
      <Link href={href} className="mg-month-nav__btn" aria-label={t(dir)} title={t(dir)}>
        <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
      </Link>
    ) : (
      <span className="mg-month-nav__btn mg-month-nav__btn--disabled" aria-hidden="true">
        <Icon size={20} strokeWidth={1.5} />
      </span>
    );
  };

  return (
    <nav className="mg-month-nav" aria-label={t('label')}>
      {arrow(prevHref, 'prev')}
      <div className="mg-month-nav__center">
        <h1 className="mg-month-nav__label">{label}</h1>
        {!isCurrent && (
          <Link href="/month" className="mg-month-nav__today">
            {t('current')}
          </Link>
        )}
      </div>
      {arrow(nextHref, 'next')}
    </nav>
  );
}
