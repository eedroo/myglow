import { z } from 'zod';

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(60),
  locale: z.enum(['PT_PT', 'PT_BR', 'EN']),
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']),
  timezone: z.string().min(3),
  sleepGoalMinutes: z.number().int().min(240).max(720),
  hemisphere: z.enum(['NORTH', 'SOUTH']),
  pronouns: z.enum(['FEMININE', 'MASCULINE', 'NEUTRAL']),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
