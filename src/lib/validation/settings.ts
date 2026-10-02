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

/** F9: as definições estão em secções (Perfil, Preferências); cada formulário grava só os seus campos. */
export const settingsPatchSchema = settingsSchema.partial();
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
