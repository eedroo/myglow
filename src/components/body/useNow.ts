'use client';

import { useEffect, useState } from 'react';

export { formatClock } from '@/lib/fitness/session';

/** Hora actual, a cada `ms` (para cronómetros calculados a partir de timestamps). */
export function useNow(ms = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), ms);
    const onVisible = () => setNow(new Date());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ms]);
  return now;
}
