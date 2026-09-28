import { ProjectArea } from '@prisma/client';
import { z } from 'zod';

export const weekPatchSchema = z
  .object({
    title: z.string().max(80),
    intention: z.string().max(1000),
    weightGrams: z.number().int().min(20_000).max(400_000).nullable(),
    reflection: z.string().max(4000),
    dayNotes: z
      .array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), text: z.string().max(1000) }))
      .max(7),
    projects: z.array(z.object({ area: z.nativeEnum(ProjectArea), text: z.string().max(500) })).max(5),
  })
  .partial()
  .strict()
  .refine((p) => Object.keys(p).length > 0);

export type WeekPatchInput = z.infer<typeof weekPatchSchema>;
