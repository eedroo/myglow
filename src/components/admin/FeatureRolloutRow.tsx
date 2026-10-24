'use client';

import { useState, useTransition } from 'react';
import type { FeatureRollout } from '@prisma/client';
import { setFeatureRollout } from '@/actions/admin';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

/** Estado global de uma funcionalidade: escondida, só premium, ou para todos. */
export function FeatureRolloutRow({ featureKey, phase, rollout, overrides }: { featureKey: string; phase: number; rollout: FeatureRollout; overrides: number }) {
  const [value, setValue] = useState<FeatureRollout>(rollout);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mg-admin-row">
      <span className="mg-admin-row__key">
        {featureKey}{' '}
        <span className="mg-admin-row__hint">
          (fase {phase} · {overrides} {overrides === 1 ? 'excepção' : 'excepções'})
        </span>
      </span>
      <SegmentedControl
        name={`rollout-${featureKey}`}
        legend={`Estado de ${featureKey}`}
        hideLegend
        value={value}
        onChange={(v) => {
          const prev = value;
          setValue(v);
          start(async () => {
            const res = await setFeatureRollout(featureKey, v);
            if (!res.ok) {
              setValue(prev);
              setError(res.error);
            } else setError(null);
          });
        }}
        options={[
          { value: 'HIDDEN', label: 'Escondida' },
          { value: 'PREMIUM', label: 'Premium' },
          { value: 'ALL', label: 'Todos' },
        ]}
      />
      {(pending || error) && (
        <span className="mg-admin-row__hint" role="status">
          {pending ? 'A guardar…' : error}
        </span>
      )}
    </div>
  );
}
