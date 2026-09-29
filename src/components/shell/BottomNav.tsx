'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, CalendarRange, Sun, Telescope, UserRound, type LucideIcon } from 'lucide-react';

export type NavKey = 'today' | 'week' | 'month' | 'year' | 'profile';

const ITEMS: { key: NavKey; href: string; icon: LucideIcon }[] = [
  { key: 'today', href: '/today', icon: Sun },
  { key: 'week', href: '/week', icon: CalendarRange },
  { key: 'month', href: '/month', icon: CalendarDays },
  { key: 'year', href: '/year', icon: Telescope },
  { key: 'profile', href: '/profile', icon: UserRound },
];

interface BottomNavProps {
  labels: Record<NavKey, string>;
  ariaLabel: string;
}

/** Navegação principal: barra inferior em mobile, rail lateral em desktop. */
export function BottomNav({ labels, ariaLabel }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="mg-bottom-nav" aria-label={ariaLabel}>
      {ITEMS.map(({ key, href, icon: Icon }) => {
        const active =
          pathname === href ||
          pathname.startsWith(`${href}/`) ||
          (key === 'today' && pathname.startsWith('/day/')) ||
          (key === 'profile' && (pathname === '/settings' || pathname.startsWith('/settings/')));
        return (
          <Link
            key={key}
            href={href}
            className={active ? 'mg-bottom-nav__item mg-bottom-nav__item--active' : 'mg-bottom-nav__item'}
            aria-current={active ? 'page' : undefined}
          >
            <span className="mg-bottom-nav__icon">
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="mg-bottom-nav__label">{labels[key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
