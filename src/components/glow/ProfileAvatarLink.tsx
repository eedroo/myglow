'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Link do avatar para /profile, activo também em /settings (o perfil saiu da barra de navegação). */
export function ProfileAvatarLink({ label, children }: { label: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = ['/profile', '/settings'].some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return (
    <Link
      href="/profile"
      className={active ? 'mg-level-badge mg-level-badge--active' : 'mg-level-badge'}
      aria-label={label}
      title={label}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
