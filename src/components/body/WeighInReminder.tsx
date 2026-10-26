'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { setWeighInReminder } from '@/actions/body';
import { CheckChip } from '@/components/ui/CheckChip';

const TIMES = Array.from({ length: 24 * 4 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`).filter(
  (h) => h >= '05:00' && h <= '23:45',
);

/** Lembrete de pesagem: interruptor e hora (só sai se ainda não houver registo nesse dia). */
export function WeighInReminder({ enabled, time }: { enabled: boolean; time: string }) {
  const t = useTranslations('body.weight');
  const [on, setOn] = useState(enabled);
  const [at, setAt] = useState(time);
  const [, start] = useTransition();
  const save = (e: boolean, h: string) => start(async () => void (await setWeighInReminder(e, h)));
  return (
    <div className="mg-weighin">
      <CheckChip
        icon="sparkles"
        label={t('reminder')}
        checked={on}
        onCheckedChange={(v) => {
          setOn(v);
          save(v, at);
        }}
      />
      <select
        className="mg-input"
        aria-label={t('reminderTime')}
        value={at}
        disabled={!on}
        onChange={(e) => {
          setAt(e.target.value);
          save(on, e.target.value);
        }}
      >
        {TIMES.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );
}
