'use client';

import { useCallback, useState } from 'react';
import type { ProjectArea } from '@prisma/client';
import { patchWeek } from '@/actions/week';
import type { DateISO } from '@/lib/dates';
import { mergeWeekPatches } from '@/lib/week/patch';
import type { WeekData, WeekPatch } from '@/types/week';
import { useAutosaveQueue } from './useAutosaveQueue';

type WeekTextField = 'title' | 'intention' | 'reflection';

/** Estado da semana com gravação automática (texto com debounce, peso imediato). */
export function useWeekAutosave(initial: WeekData) {
  const [data, setData] = useState<WeekData>(initial);
  const start = initial.start;

  const save = useCallback((patch: WeekPatch) => patchWeek(start, patch), [start]);
  const onSaved = useCallback((updatedAt: string) => setData((d) => ({ ...d, updatedAt })), []);
  const { queue, flush, status, errorKey } = useAutosaveQueue<WeekPatch>({
    save,
    merge: mergeWeekPatches,
    resetKey: start,
    onSaved,
  });

  const setText = useCallback(
    (key: WeekTextField, value: string) => {
      setData((d) => ({ ...d, [key]: value }));
      queue({ [key]: value }, 'debounced');
    },
    [queue],
  );

  const setWeight = useCallback(
    (grams: number | null) => {
      setData((d) => ({ ...d, weightGrams: grams }));
      queue({ weightGrams: grams }, 'now');
    },
    [queue],
  );

  const setDayNote = useCallback(
    (date: DateISO, text: string) => {
      setData((d) => ({ ...d, dayNotes: { ...d.dayNotes, [date]: text } }));
      queue({ dayNotes: [{ date, text }] }, 'debounced');
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

  return { data, setText, setWeight, setDayNote, setProject, status, errorKey, flush };
}
