export interface DailyEntryData {
  date: string; // DateISO
  intention: string;
  morningBanishName: string;
  morningBanishDone: boolean;
  morningRitualDone: boolean;
  sleepGoalMet: boolean;
  wakeMood: number | null; // 1–5
  wakeNote: string;
  stretchDone: boolean;
  workoutDone: boolean;
  waterDone: boolean;
  nightBanishName: string;
  nightBanishDone: boolean;
  nightRitualDone: boolean;
  gratitude: string;
  mood: number | null; // 1–5
  reflection: string;
  summary: string;
  updatedAt: string | null; // null se ainda não existe na DB
}

export type DailyField = Exclude<keyof DailyEntryData, 'date' | 'updatedAt'>;
export type DailyPatch = Partial<Pick<DailyEntryData, DailyField>>;
export type DayPeriod = 'morning' | 'body' | 'night';

/** Campos de texto: na UI string vazia, na DB `null`. Gravam com debounce. */
export const DAILY_TEXT_FIELDS = [
  'intention', 'morningBanishName', 'wakeNote', 'nightBanishName', 'gratitude', 'reflection', 'summary',
] as const satisfies readonly DailyField[];

export type DailyTextField = (typeof DAILY_TEXT_FIELDS)[number];

export function isDailyTextField(key: DailyField): key is DailyTextField {
  return (DAILY_TEXT_FIELDS as readonly string[]).includes(key);
}

export function emptyDailyEntry(date: string): DailyEntryData {
  return {
    date,
    intention: '',
    morningBanishName: '',
    morningBanishDone: false,
    morningRitualDone: false,
    sleepGoalMet: false,
    wakeMood: null,
    wakeNote: '',
    stretchDone: false,
    workoutDone: false,
    waterDone: false,
    nightBanishName: '',
    nightBanishDone: false,
    nightRitualDone: false,
    gratitude: '',
    mood: null,
    reflection: '',
    summary: '',
    updatedAt: null,
  };
}
