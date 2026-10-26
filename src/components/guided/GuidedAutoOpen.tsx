'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * "Abrir o Hoje no modo guiado" (F18): ao entrar no Hoje, abre o fluxo sugerido. O layout só o monta quando ainda não
 * há `GuidedRun` desse fluxo e dia, e quando nada com mais prioridade (guia, políticas, nível, retrospectiva) está aberto.
 */
export function GuidedAutoOpen({ href }: { href: string }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (pathname !== '/today') return;
    const key = `mg-guided-auto:${href}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch {
      // sem armazenamento: o GuidedRun criado ao abrir evita repetir
    }
    router.push(href);
  }, [pathname, href, router]);
  return null;
}
