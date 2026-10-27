import { STAGES, filled, type JourneyEntry, type StageNumber, type UnlockId } from './stages';

/**
 * F19: utilizadores anteriores à jornada. Uma etapa k (2–5) fica aberta se a pessoa alguma vez usou um campo dela
 * (pelo menos 1 dia); a etapa final é a maior aberta. Ninguém perde o que já usava. Puro; a migração `journey`
 * aplica as mesmas regras em SQL.
 */
export interface MapWeek {
  reflection: string | null;
  /** Tem intenções por área (ProjectIntention WEEK). */
  hasProjects: boolean;
}

const USED: Record<2 | 3 | 4 | 5, (e: JourneyEntry) => boolean> = {
  2: (e) => filled(e.morningBanishName) || filled(e.nightBanishName) || e.morningBanishDone || e.nightBanishDone,
  3: (e) => e.morningRitualDone || e.nightRitualDone || e.sleepGoalMet || e.wakeMood !== null || filled(e.wakeNote),
  4: (e) => e.stretchDone || e.workoutDone || e.waterDone,
  5: (e) => filled(e.reflection) || filled(e.summary),
};

export function mapExistingUser(
  entries: JourneyEntry[],
  weeks: MapWeek[],
  opts: { hasMonthOrYear?: boolean } = {},
): { stage: StageNumber; unlocks: UnlockId[] } {
  let stage: StageNumber = 1;
  for (const k of [2, 3, 4, 5] as const) {
    const used = entries.some(USED[k]) || (k === 3 && weeks.some((w) => w.hasProjects));
    if (used) stage = k;
  }
  const unlocks = STAGES.filter((s) => s.unlockId && s.stage <= stage).map((s) => s.unlockId!);
  if (weeks.some((w) => filled(w.reflection)) || opts.hasMonthOrYear || stage >= 3) unlocks.push('month-year');
  return { stage, unlocks };
}
