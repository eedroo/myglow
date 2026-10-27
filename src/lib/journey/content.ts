import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { MAGIC_ICON_NAMES } from '@/lib/icons';
import type { AppLocale } from '@/i18n/locales';
import { UNLOCK_IDS, type UnlockId } from './stages';

/** F19: mini-lições de desbloqueio (`content/journey/{locale}.json`), validadas. */
export const JOURNEY_DIR = path.join(process.cwd(), 'content', 'journey');

const tryTarget = z.discriminatedUnion('kind', [
  // DAY_NOW: manhã ou noite conforme a hora (o primeiro banimento).
  z.object({ kind: z.literal('guided'), flow: z.enum(['DAY_NOW', 'DAY_MORNING', 'DAY_BODY', 'DAY_NIGHT', 'MONTH_PLAN']) }),
  z.object({ kind: z.literal('route'), href: z.string().startsWith('/') }),
]);

export const journeyLessonSchema = z.object({
  unlockId: z.enum(UNLOCK_IDS as [UnlockId, ...UnlockId[]]),
  slides: z
    .array(
      z.object({
        id: z.string().min(1),
        icon: z.enum(MAGIC_ICON_NAMES),
        title: z.string().min(1),
        text: z.string().min(1),
        /** Só com consentimento de bem-estar ou com o Foco no corpo. */
        only: z.enum(['wellbeing', 'body-pro']).optional(),
      }),
    )
    .min(3)
    .max(7),
  tryLabel: z.string().min(1),
  tryTarget,
});

export const journeyContentSchema = z.object({ lessons: z.array(journeyLessonSchema) });

export type JourneyLesson = z.infer<typeof journeyLessonSchema>;
export type JourneyTryTarget = z.infer<typeof tryTarget>;

const cache = new Map<AppLocale, JourneyLesson[]>();

export function getJourneyLessons(locale: AppLocale, dir = JOURNEY_DIR): JourneyLesson[] {
  const hit = cache.get(locale);
  if (hit && process.env.NODE_ENV !== 'development') return hit;
  const data = journeyContentSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, `${locale}.json`), 'utf8')));
  cache.set(locale, data.lessons);
  return data.lessons;
}

export function getJourneyLesson(locale: AppLocale, unlockId: UnlockId): JourneyLesson | null {
  return getJourneyLessons(locale).find((l) => l.unlockId === unlockId) ?? null;
}
