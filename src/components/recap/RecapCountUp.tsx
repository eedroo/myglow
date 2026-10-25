'use client';

import { useEffect, useState } from 'react';

interface RecapCountUpProps {
  value: number;
  locale: string;
  /** Texto antes do número (ex.: "+"). */
  prefix?: string;
  /** Sem animação (slide pré-carregado). */
  still?: boolean;
}

const DURATION_MS = 800;

/** Número grande que conta de 0 até ao valor; com movimento reduzido aparece logo. */
export function RecapCountUp({ value, locale, prefix = '', still = false }: RecapCountUpProps) {
  const [shown, setShown] = useState(still ? value : 0);

  useEffect(() => {
    if (still || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION_MS);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, still]);

  const fmt = new Intl.NumberFormat(locale);
  return (
    <span className="mg-recap-count">
      <span aria-hidden="true">
        {prefix}
        {fmt.format(shown)}
      </span>
      <span className="mg-visually-hidden">
        {prefix}
        {fmt.format(value)}
      </span>
    </span>
  );
}
