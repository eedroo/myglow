import type { DateISO } from '@/lib/dates';
import type { JourneyEntry } from './stages';

/** Entrada vazia para testes da jornada. */
export const entry = (date: DateISO, patch: Partial<JourneyEntry> = {}): JourneyEntry => ({
  date,
  intention: null, morningBanishName: null, morningBanishDone: false, morningRitualDone: false, sleepGoalMet: false,
  wakeMood: null, wakeNote: null, stretchDone: false, workoutDone: false, waterDone: false,
  nightBanishName: null, nightBanishDone: false, nightRitualDone: false, gratitude: null, mood: null,
  reflection: null, summary: null,
  ...patch,
});
