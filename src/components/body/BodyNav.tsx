'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Dumbbell, History, ListChecks, PersonStanding } from 'lucide-react';

const ICONS = [ListChecks, Dumbbell, History, CalendarDays, PersonStanding];

/** Navegação própria do Foco no corpo: Treinos · Exercícios · Sessões · Dia · Corpo (F17). */
export function BodyNav({ label, items }: { label: string; items: { href: string; label: string; match: string[] }[] }) {
  const pathname = usePathname();
  const isActive = (match: string[]) =>
    match.some((m) => (m === '/body' ? pathname === '/body' : pathname === m || pathname.startsWith(`${m}/`)));
  return (
    <nav className="mg-body-nav" aria-label={label}>
      {items.map((item, i) => {
        const Icon = ICONS[i] ?? ListChecks;
        const active = isActive(item.match);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? 'mg-body-nav__item mg-body-nav__item--active' : 'mg-body-nav__item'}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
