import { z } from 'zod';

const text = (max: number) => z.string().max(max);
const mood = z.number().int().min(1).max(5).nullable();

export const dailyPatchSchema = z
  .object({
    intention: text(500),
    morningBanishName: text(80),
    morningBanishDone: z.boolean(),
    morningRitualDone: z.boolean(),
    sleepGoalMet: z.boolean(),
    wakeMood: mood,
    wakeNote: text(500),
    stretchDone: z.boolean(),
    workoutDone: z.boolean(),
    waterDone: z.boolean(),
    nightBanishName: text(80),
    nightBanishDone: z.boolean(),
    nightRitualDone: z.boolean(),
    gratitude: text(2000),
    mood,
    reflection: text(4000),
    summary: text(4000),
  })
  .partial()
  .strict()
  .refine((p) => Object.keys(p).length > 0);

export type DailyPatchInput = z.infer<typeof dailyPatchSchema>;
