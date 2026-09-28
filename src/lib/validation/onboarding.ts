import { z } from 'zod';

export const birthProfileSchema = z
  .object({
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // local
    birthTimeKnown: z.boolean(),
    birthTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(), // local
    placeName: z.string().min(2).max(160),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    timezone: z.string().min(3), // IANA
    userTimezone: z.string().min(3), // Intl.DateTimeFormat().resolvedOptions().timeZone
  })
  .refine((v) => new Date(v.birthDate) <= new Date(), { path: ['birthDate'] })
  .refine((v) => !v.birthTimeKnown || v.birthTime !== null, { path: ['birthTime'] });

export type BirthProfileInput = z.infer<typeof birthProfileSchema>;
