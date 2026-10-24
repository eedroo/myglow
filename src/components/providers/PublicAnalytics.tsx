'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';

/** Só estas páginas públicas contam; dentro da app nada é enviado (nem depois de entrar sem recarregar). */
const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/privacy', '/terms']);

function onlyPublic(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    return PUBLIC_PATHS.has(new URL(event.url).pathname) ? event : null;
  } catch {
    return null;
  }
}

/** Vercel Web Analytics (F12): estatísticas agregadas sem cookies, só nas páginas públicas. */
export function PublicAnalytics() {
  return <Analytics beforeSend={onlyPublic} />;
}
