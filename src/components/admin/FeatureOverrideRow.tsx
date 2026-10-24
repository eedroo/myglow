'use client';

import { useState, useTransition } from 'react';
import { setFeatureOverride } from '@/actions/admin';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

type Choice = 'rule' | 'on' | 'off';

/** Excepção por pessoa: seguir a regra global, forçar ligado ou forçar desligado. */
export function FeatureOverrideRow({ userId, featureKey, override, effective }: { userId: string; featureKey: string; override: boolean | null; effective: boolean }) {
  const [value, setValue] = useState<Choice>(override === null ? 'rule' : override ? 'on' : 'off');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mg-admin-row">
      <span className="mg-admin-row__key">
        {featureKey} <span className="mg-admin-row__hint">({effective ? 'tem acesso' : 'sem acesso'})</span>
      </span>
      <SegmentedControl
        name={`override-${featureKey}`}
        legend={`Excepção para ${featureKey}`}
        hideLegend
        value={value}
        onChange={(v) => {
          const prev = value;
          setValue(v);
          start(async () => {
            const res = await setFeatureOverride(userId, featureKey, v === 'rule' ? null : v === 'on');
            if (!res.ok) {
              setValue(prev);
              setError(res.error);
            } else setError(null);
          });
        }}
        options={[
          { value: 'rule', label: 'Seguir regra' },
          { value: 'on', label: 'Forçar ligado' },
          { value: 'off', label: 'Forçar desligado' },
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
