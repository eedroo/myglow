'use client';

import { useCallback, useState } from 'react';
import type { ProjectArea } from '@prisma/client';
import { patchYear } from '@/actions/planner';
import { mergePlanPatches } from '@/lib/planner/patch';
import type { YearPatch, YearPlanData } from '@/types/planner';
import { useAutosaveQueue } from './useAutosaveQueue';

/** Planner anual com gravação automática (texto com debounce). */
export function useYearAutosave(initial: YearPlanData) {
  const [data, setData] = useState<YearPlanData>(initial);
  const { year } = initial;

  const save = useCallback((patch: YearPatch) => patchYear(year, patch), [year]);
  const onSaved = useCallback((updatedAt: string) => setData((d) => ({ ...d, updatedAt })), []);
  const { queue, flush, status, errorKey } = useAutosaveQueue<YearPatch>({
    save,
    merge: mergePlanPatches,
    resetKey: String(year),
    onSaved,
  });

  const setText = useCallback(
    (key: 'word' | 'intention' | 'reflection', value: string) => {
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
