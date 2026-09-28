'use client';

import { useEffect } from 'react';

/** Regista /sw.js apenas em produção. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Sem SW a app continua a funcionar; não há nada a mostrar ao utilizador.
    });
  }, []);

  return null;
}
