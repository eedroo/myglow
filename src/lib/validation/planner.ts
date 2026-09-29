import { ProjectArea } from '@prisma/client';
import { z } from 'zod';

const projects = z.array(z.object({ area: z.nativeEnum(ProjectArea), text: z.string().max(500) })).max(5);

export const monthPatchSchema = z
  .object({ intention: z.string().max(1000), reflection: z.string().max(6000), projects })
  .partial()
  .strict()
  .refine((p) => Object.keys(p).length > 0);

export const yearPatchSchema = z
  .object({ word: z.string().trim().max(40), intention: z.string().max(2000), reflection: z.string().max(10000), projects })
  .partial()
  .strict()
  .refine((p) => Object.keys(p).length > 0);
