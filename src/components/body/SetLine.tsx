import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Uma série numa linha: a hora (e o descanso antes) à esquerda; à direita o número grande com a unidade pequena
 * (reps e kg, ou segundos) e o fim (✓, troféu, …).
 */
export function SetLine({
  time,
  rest,
  reps,
  kg,
  seconds,
  end,
}: {
  time?: string | null;
  rest?: string | null;
  reps?: number | null;
  /** Já formatado (ex.: "62,3"). */
  kg?: string | null;
  seconds?: number | null;
  end?: ReactNode;
}) {
  const t = useTranslations('fitness.units');
  return (
    <span className="mg-set-line">
      <span className="mg-set-line__time">
        {time}
        {rest && <span className="mg-set-line__rest"> {rest}</span>}
      </span>
      {seconds != null ? (
        <span className="mg-set-line__metric mg-set-line__metric--time">
          <span className="mg-set-line__num">{seconds}</span> <span className="mg-set-line__unit">{t('seconds')}</span>
        </span>
      ) : (
        <>
          {reps != null && (
            <span className="mg-set-line__metric mg-set-line__metric--reps">
              <span className="mg-set-line__num">{reps}</span> <span className="mg-set-line__unit">{t('reps', { n: reps })}</span>
            </span>
          )}
          {kg != null && (
            <span className="mg-set-line__metric mg-set-line__metric--kg">
              <span className="mg-set-line__num">{kg}</span> <span className="mg-set-line__unit">{t('kg')}</span>
            </span>
          )}
        </>
      )}
      <span className="mg-set-line__end">{end}</span>
    </span>
  );
}
