'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, CalendarDays, CalendarRange, Lock, Sun, Telescope, type LucideIcon } from 'lucide-react';
import { NavLockedSheet } from '@/components/journey-path/NavLockedSheet';

export type NavKey = 'today' | 'week' | 'month' | 'year' | 'grimoire';

const ITEMS: { key: NavKey; href: string; icon: LucideIcon }[] = [
  { key: 'today', href: '/today', icon: Sun },
  { key: 'week', href: '/week', icon: CalendarRange },
  { key: 'month', href: '/month', icon: CalendarDays },
  { key: 'year', href: '/year', icon: Telescope },
  { key: 'grimoire', href: '/grimoire', icon: BookOpen },
];

interface BottomNavProps {
  labels: Record<NavKey, string>;
  ariaLabel: string;
  /** F19: itens ainda bloqueados na jornada (Mês e Ano): esbatidos com cadeado; tocar explica como abrir. */
  locked?: NavKey[];
}

/** Navegação principal: barra inferior em mobile, rail lateral em desktop. */
export function BottomNav({ labels, ariaLabel, locked = [] }: BottomNavProps) {
  const pathname = usePathname();
  const sheet = useRef<HTMLDialogElement>(null);

  return (
    <nav className="mg-bottom-nav" aria-label={ariaLabel}>
      {ITEMS.map(({ key, href, icon: Icon }) => {
        if (locked.includes(key)) {
          return (
            <button
              key={key}
              type="button"
              className="mg-bottom-nav__item mg-bottom-nav__item--locked"
              aria-haspopup="dialog"
              onClick={() => sheet.current?.showModal()}
            >
              <span className="mg-bottom-nav__icon">
                <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span className="mg-bottom-nav__lock" aria-hidden="true">
                <Lock size={10} strokeWidth={2} />
              </span>
              <span className="mg-bottom-nav__label">{labels[key]}</span>
            </button>
          );
        }
        const active =
          pathname === href ||
          pathname.startsWith(`${href}/`) ||
          (key === 'today' && pathname.startsWith('/day/'));
        return (
          <Link
            key={key}
            href={href}
            data-tour={key === 'week' ? 'nav-week' : key === 'grimoire' ? 'nav-grimoire' : undefined}
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
      {locked.length > 0 && <NavLockedSheet ref={sheet} />}
    </nav>
  );
}
