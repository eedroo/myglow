'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import type { MapMuscle, Recovery } from '@/lib/body/muscles';
import { ANTERIOR_SHAPES, POSTERIOR_SHAPES, type MapShape } from '@/lib/body/mapShapes';
import { MuscleExercisesSheet } from './MuscleExercisesSheet';

type Recent = Partial<Record<MapMuscle, { id: string; name: string; date: string }[]>>;
const STATE: Record<Recovery, 'just' | 'mid' | 'rested'> = { 'just-trained': 'just', recovering: 'mid', rested: 'rested' };

/** Uma vista (frente ou costas): brilho por baixo dos músculos acabados de treinar, músculos com gradiente, corpo neutro. */
function BodyView({
  shapes,
  label,
  recovery,
  selected,
  onPick,
}: {
  shapes: MapShape[];
  label: string;
  recovery: Record<MapMuscle, Recovery>;
  selected: MapMuscle | null;
  onPick: (m: MapMuscle) => void;
}) {
  const t = useTranslations('body.map');
  const id = useId().replace(/:/g, '');
  const isMuscle = (p: string): p is MapMuscle => p in recovery;
  const stateOf = (p: string) => (isMuscle(p) ? STATE[recovery[p]] : 'neutral');
  const key = (m: MapMuscle) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPick(m);
    }
  };
  return (
    <figure className="mg-muscle-map__view">
      <svg viewBox="-6 -4 112 210" role="group" aria-label={label}>
        <defs>
          {(['just', 'mid', 'rested'] as const).map((s) => (
            <linearGradient key={s} id={`${id}-${s}`} x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0" className={`mg-muscle-map__stop--${s}-hi`} />
              <stop offset="1" className={`mg-muscle-map__stop--${s}-lo`} />
            </linearGradient>
          ))}
          <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>
        <g className="mg-muscle-map__glow" filter={`url(#${id}-glow)`} aria-hidden="true">
          {shapes
            .filter((s) => stateOf(s.part) === 'just')
            .flatMap((s) => s.points.map((p, i) => <polygon key={`${s.part}${i}`} points={p} />))}
        </g>
        {shapes.map((s) => {
          const state = stateOf(s.part);
          const polys = s.points.map((p, i) => (
            <polygon key={i} points={p} className={`mg-muscle-map__shape mg-muscle-map__shape--${state}`} fill={state === 'neutral' ? undefined : `url(#${id}-${state})`} />
          ));
          if (!isMuscle(s.part)) return <g key={s.part} aria-hidden="true">{polys}</g>;
          const m = s.part;
          return (
            <g
              key={m}
              role="button"
              tabIndex={0}
              className={`mg-muscle-map__muscle${selected === m ? ' mg-muscle-map__muscle--selected' : ''}`}
              aria-label={`${t(`muscles.${m}`)}: ${t(STATE[recovery[m]])}`}
              onClick={() => onPick(m)}
              onKeyDown={key(m)}
            >
              {polys}
            </g>
          );
        })}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

/** Frente e costas com o estado de recuperação; tocar num músculo lista os últimos exercícios. */
export function MuscleMap({ recovery, recent }: { recovery: Record<MapMuscle, Recovery>; recent: Recent }) {
  const t = useTranslations('body.map');
  const [muscle, setMuscle] = useState<MapMuscle | null>(null);
  return (
    <section className="mg-muscle-map" aria-label={t('title')}>
      <div className="mg-muscle-map__views">
        <BodyView shapes={ANTERIOR_SHAPES} label={t('front')} recovery={recovery} selected={muscle} onPick={setMuscle} />
        <BodyView shapes={POSTERIOR_SHAPES} label={t('back')} recovery={recovery} selected={muscle} onPick={setMuscle} />
      </div>
      <ul className="mg-muscle-map__legend">
        {(['just', 'mid', 'rested'] as const).map((s) => (
          <li key={s}>
            <span className={`mg-muscle-map__swatch mg-muscle-map__swatch--${s}`} aria-hidden="true" />
            {t(s)}
          </li>
        ))}
      </ul>
      <MuscleExercisesSheet muscle={muscle} recovery={muscle ? recovery[muscle] : 'rested'} items={muscle ? (recent[muscle] ?? []) : []} onClose={() => setMuscle(null)} />
    </section>
  );
}
