'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { patchDailyEntry } from '@/actions/daily';
import { isDailyTextField, type DailyEntryData, type DailyField, type DailyPatch } from '@/types/daily';
import { useAutosaveQueue, type SaveOk } from './useAutosaveQueue';
import { useGlow } from '@/components/glow/GlowProvider';
import { dailyTourEvents, emitTourEvent } from '@/lib/tour/bus';

export type { SaveStatus } from './useAutosaveQueue';

const mergePatches = (a: DailyPatch, b: DailyPatch): DailyPatch => ({ ...a, ...b });

/**
 * Estado do diário com gravação automática (ver `useAutosaveQueue`):
 * checks e escalas gravam logo; textos com debounce de 800 ms (e `flush` no blur).
 */
export function useDailyAutosave(date: string, initial: DailyEntryData) {
  const [data, setData] = useState<DailyEntryData>(initial);

  // Gravado com sucesso: avisa o guia (F11) das acções reais (intenção, banimento, como acordei).
  const save = useCallback(
    (patch: DailyPatch) =>
      patchDailyEntry(date, patch).then((r) => {
        if (r.ok) dailyTourEvents(patch).forEach(emitTourEvent);
        return r;
      }),
    [date],
  );
  const onSaved = useCallback((updatedAt: string) => setData((d) => ({ ...d, updatedAt })), []);
  const glow = useGlow();
  const onResult = useCallback((r: SaveOk) => r.xp && glow.push(r.xp), [glow]);
  const { queue, flush, status, errorKey } = useAutosaveQueue<DailyPatch>({
    save,
    merge: mergePatches,
    resetKey: date,
    onSaved,
    onResult,
  });

  const setField = useCallback(
    <K extends DailyField>(key: K, value: DailyEntryData[K]) => {
      setData((d) => ({ ...d, [key]: value }));
      queue({ [key]: value } as DailyPatch, isDailyTextField(key) ? 'debounced' : 'now');
    },
    [queue],
  );

  // Mudança de dia: carrega os dados do novo dia (o que falta do anterior é gravado pela fila).
  const lastDate = useRef(date);
  useEffect(() => {
    if (lastDate.current === date) return;
    lastDate.current = date;
    setData(initial);
  }, [date, initial]);

  return { data, setField, status, errorKey, flush };
}
