'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const SESSION_KEY = 'mg_recap_auto';

/** Abre a retrospectiva sozinha uma vez por sessão (o servidor já decidiu que é devida e vale a pena). */
export function RecapAutoOpen({ href }: { href: string }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/recap')) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === href) return;
      sessionStorage.setItem(SESSION_KEY, href);
    } catch {
      // sem sessionStorage: abre na mesma; a vista gravada no servidor impede repetir
    }
    router.push(`${href}?auto=1`);
  }, [href, pathname, router]);

  return null;
}
