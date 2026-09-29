'use client';

import { useCallback, useState } from 'react';
import type { ProjectArea } from '@prisma/client';
import { patchMonth } from '@/actions/planner';
import { mergePlanPatches } from '@/lib/planner/patch';
import type { MonthPatch, MonthPlanData } from '@/types/planner';
import { useAutosaveQueue } from './useAutosaveQueue';

/** Planner mensal com gravação automática (texto com debounce). */
export function useMonthAutosave(initial: MonthPlanData) {
  const [data, setData] = useState<MonthPlanData>(initial);
  const { year, month } = initial;

  const save = useCallback((patch: MonthPatch) => patchMonth(year, month, patch), [year, month]);
  const onSaved = useCallback((updatedAt: string) => setData((d) => ({ ...d, updatedAt })), []);
  const { queue, flush, status, errorKey } = useAutosaveQueue<MonthPatch>({
    save,
    merge: mergePlanPatches,
    resetKey: `${year}-${month}`,
    onSaved,
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
