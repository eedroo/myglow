'use client';

import { useCallback, useRef, useState } from 'react';
import type { ProjectArea } from '@prisma/client';
import { patchWeek } from '@/actions/week';
import type { DateISO } from '@/lib/dates';
import { mergeWeekPatches } from '@/lib/week/patch';
import type { WeekData, WeekPatch } from '@/types/week';
import { useAutosaveQueue, type AutosaveOptions, type SaveOk } from './useAutosaveQueue';
import { useGlow } from '@/components/glow/GlowProvider';
import { emitTourEvent, weekTourEvents } from '@/lib/tour/bus';

type WeekTextField = 'title' | 'intention' | 'reflection';

/** Estado da semana com gravação automática (texto com debounce, peso imediato). */
export function useWeekAutosave(initial: WeekData, opts: AutosaveOptions = {}) {
  const [data, setData] = useState<WeekData>(initial);
  const start = initial.start;

  // Gravado com sucesso: avisa o guia (F11) da intenção da semana.
  const save = useCallback(
    (patch: WeekPatch) =>
      patchWeek(start, patch).then((r) => {
        if (r.ok) weekTourEvents(patch).forEach(emitTourEvent);
        return r;
      }),
    [start],
  );
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
  const { queue, flush, status, errorKey } = useAutosaveQueue<WeekPatch>({
    save,
    merge: mergeWeekPatches,
    resetKey: start,
    onSaved,
    onResult,
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
