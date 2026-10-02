import { z } from 'zod';
import { FeedbackKind } from '@prisma/client';

/** Feedback do beta (F10). */
export const FEEDBACK_KINDS = Object.values(FeedbackKind);

export const feedbackSchema = z.object({
  kind: z.nativeEnum(FeedbackKind),
  message: z.string().trim().min(5).max(2000),
  path: z.string().max(200).optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
