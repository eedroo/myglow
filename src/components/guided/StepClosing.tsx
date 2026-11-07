'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Check } from 'lucide-react';
import { RecapCountUp } from '@/components/recap/RecapCountUp';
import { MagicIcon } from '@/components/ui/MagicIcon';

/** Celebração: o que ficou feito, o Glow ganho neste fluxo e o próximo passo sugerido. */
export function StepClosing({
  title,
  items,
  glow,
  glowLabel,
  next,
  back,
  lead = null,
}: {
  title: string;
  items: string[];
  glow: number;
  glowLabel: string;
  next: { label: string; href: string } | null;
  back: { label: string; href: string };
  /** Passo seguinte em destaque (ex.: ao domingo, a retrospectiva da semana que passou). */
  lead?: { title: string; label: string; href: string } | null;
}) {
  const locale = useLocale();
  return (
    <div className="mg-step mg-step-closing">
      <span className="mg-step-closing__glow" aria-hidden="true">
        <MagicIcon name="glow-orb" size="xl" decorative />
      </span>
      <h2 className="mg-step__title">{title}</h2>
      {items.length > 0 && (
        <ul className="mg-step-closing__list">
          {items.map((i) => (
            <li key={i}>
              <Check size={16} aria-hidden="true" />
              {i}
            </li>
          ))}
        </ul>
      )}
      {glow > 0 && (
        <p className="mg-step-closing__xp">
          <RecapCountUp value={glow} locale={locale} prefix="+" /> {glowLabel}
        </p>
      )}
      {lead && (
        <div className="mg-step-closing__lead">
          <p className="mg-step-closing__lead-title">{lead.title}</p>
          <Link className="mg-btn mg-btn--primary mg-btn--block" href={lead.href}>
            {lead.label}
          </Link>
        </div>
      )}
      <div className="mg-step__actions">
        {next && (
          <Link className="mg-btn mg-btn--subtle" href={next.href}>
            {next.label}
          </Link>
        )}
        <Link className={lead ? 'mg-btn mg-btn--ghost' : 'mg-btn mg-btn--primary'} href={back.href}>
          {back.label}
        </Link>
      </div>
    </div>
  );
}
