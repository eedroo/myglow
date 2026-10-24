'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Métricas' },
  { href: '/admin/users', label: 'Utilizadores' },
  { href: '/admin/features', label: 'Funcionalidades' },
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/preview', label: 'Pré-visualização' },
];

/** Navegação da área de administração (só PT-PT: área interna). */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mg-admin-nav" aria-label="Administração">
      {LINKS.map((l) => {
        const active = l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={active ? 'mg-admin-nav__link mg-admin-nav__link--active' : 'mg-admin-nav__link'}
            aria-current={active ? 'page' : undefined}
          >
            {l.label}
          </Link>
        );
      })}
      <Link href="/today" className="mg-admin-nav__link">
        Voltar à app
      </Link>
    </nav>
  );
}
