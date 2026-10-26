'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Model, { type IExerciseData, type IMuscleStats, type Muscle } from 'react-body-highlighter';
import type { MapMuscle, Recovery } from '@/lib/body/muscles';
import { MuscleExercisesSheet } from './MuscleExercisesSheet';

/** Frente e costas com o estado de recuperação; tocar num músculo lista os últimos exercícios. */
export function MuscleMap({
  recovery,
  recent,
}: {
  recovery: Record<MapMuscle, Recovery>;
  recent: Partial<Record<MapMuscle, { id: string; name: string; date: string }[]>>;
}) {
  const t = useTranslations('body.map');
  const [muscle, setMuscle] = useState<MapMuscle | null>(null);
  const of = (r: Recovery) => (Object.keys(recovery) as MapMuscle[]).filter((m) => recovery[m] === r) as Muscle[];
  // A biblioteca pinta pela "frequência": 1 = a recuperar, 2 = acabou de treinar; o resto fica com a cor do corpo.
  const data: IExerciseData[] = [
    { name: 'recovering', muscles: of('recovering'), frequency: 1 },
    { name: 'just-trained', muscles: of('just-trained'), frequency: 2 },
  ];
  const colors = ['var(--recovery-mid)', 'var(--recovery-just)'];
  const onClick = ({ muscle: m }: IMuscleStats) => setMuscle(m as MapMuscle);
  return (
    <section className="mg-muscle-map" aria-label={t('title')}>
      <div className="mg-muscle-map__views">
        <div className="mg-muscle-map__view">
          <Model type="anterior" data={data} highlightedColors={colors} bodyColor="var(--recovery-rested)" onClick={onClick} />
          <span>{t('front')}</span>
        </div>
        <div className="mg-muscle-map__view">
          <Model type="posterior" data={data} highlightedColors={colors} bodyColor="var(--recovery-rested)" onClick={onClick} />
          <span>{t('back')}</span>
        </div>
      </div>
      <ul className="mg-muscle-map__legend">
        <li>
          <span className="mg-muscle-map__swatch mg-muscle-map__swatch--just" aria-hidden="true" />
          {t('just')}
        </li>
        <li>
          <span className="mg-muscle-map__swatch mg-muscle-map__swatch--mid" aria-hidden="true" />
          {t('mid')}
        </li>
        <li>
          <span className="mg-muscle-map__swatch mg-muscle-map__swatch--rested" aria-hidden="true" />
          {t('rested')}
        </li>
      </ul>
      <MuscleExercisesSheet muscle={muscle} recovery={muscle ? (recovery[muscle] ?? 'rested') : 'rested'} items={muscle ? (recent[muscle] ?? []) : []} onClose={() => setMuscle(null)} />
    </section>
  );
}
