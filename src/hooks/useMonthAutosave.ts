'use client';

import { useCallback, useRef, useState } from 'react';
import type { ProjectArea } from '@prisma/client';
import { patchMonth } from '@/actions/planner';
import { mergePlanPatches } from '@/lib/planner/patch';
import type { MonthPatch, MonthPlanData } from '@/types/planner';
import { useAutosaveQueue, type AutosaveOptions, type SaveOk } from './useAutosaveQueue';
import { useGlow } from '@/components/glow/GlowProvider';

/** Planner mensal com gravação automática (texto com debounce). */
export function useMonthAutosave(initial: MonthPlanData, opts: AutosaveOptions = {}) {
  const [data, setData] = useState<MonthPlanData>(initial);
  const { year, month } = initial;

  const save = useCallback((patch: MonthPatch) => patchMonth(year, month, patch), [year, month]);
  const onSaved = useCallback((updatedAt: string) => setData((d) => ({ ...d, updatedAt })), []);
  const glow = useGlow();
  // F18: o modo guiado soma o Glow ganho (o servidor continua a decidir).
  const onXp = useRef(opts.onXp);
  onXp.current = opts.onXp;
  const onResult = useCallback(
    (r: SaveOk) => {
      if (!r.xp) return;
      glow.push(r.xp);
      onXp.current?.(r.xp);
    },
    [glow],
  );
  const { queue, flush, status, errorKey } = useAutosaveQueue<MonthPatch>({
    save,
    merge: mergePlanPatches,
    resetKey: `${year}-${month}`,
    onSaved,
    onResult,
  });

  const setText = useCallback(
    (key: 'intention' | 'reflection', value: string) => {
      setData((d) => ({ ...d, [key]: value }));
      queue({ [key]: value }, 'debounced');
    },
    [queue],
  );

  const setProject = useCallback(
    (area: ProjectArea, text: string) => {
      setData((d) => ({ ...d, projects: { ...d.projects, [area]: text } }));
      queue({ projects: [{ area, text }] }, 'debounced');
    },
    [queue],
  );

  return { data, setText, setProject, status, errorKey, flush };
}
