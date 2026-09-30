import { z } from 'zod';
import { MAGIC_ICON_NAMES } from '@/lib/icons';

/** Formato do conteúdo do Grimório (`content/grimoire/**`). Conteúdo é dados: nada disto vive em componentes. */
const text = (max: number) => z.string().min(1).max(max);
const iconName = z.enum(MAGIC_ICON_NAMES);

export const GRIMOIRE_LOCALES = ['pt-BR', 'pt-PT', 'en'] as const;
export const grimoireLocaleSchema = z.enum(GRIMOIRE_LOCALES);
export type GrimoireLocale = z.infer<typeof grimoireLocaleSchema>;

export const PRACTICE_HREFS = ['/today', '/week', '/month', '/year', '/profile'] as const;

export const quizQuestionSchema = z
  .object({
    id: z.string().min(1),
    prompt: text(160),
    options: z.array(z.object({ id: z.string().min(1), text: text(90) })).min(2).max(4),
    correct: z.string(),
    explanation: text(220),
  })
  .refine((q) => q.options.some((o) => o.id === q.correct), { message: 'correct must match an option id' });

export const cardSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string(), type: z.literal('concept'), title: text(60), body: text(420) }),
  z.object({ id: z.string(), type: z.literal('icon'), icon: iconName, title: text(60), body: text(420) }),
  z.object({ id: z.string(), type: z.literal('example'), title: text(60), body: text(420) }),
  z.object({ id: z.string(), type: z.literal('didYouKnow'), body: text(320) }),
  z.object({ id: z.string(), type: z.literal('reflection'), prompt: text(160) }),
  z.object({
    id: z.string(),
    type: z.literal('practice'),
    title: text(60),
    body: text(320),
    action: z.object({ label: text(30), href: z.enum(PRACTICE_HREFS) }),
  }),
]);

export const lessonSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: text(70),
  minutes: z.number().int().min(1).max(10),
  tags: z.array(z.string()),
  cards: z.array(cardSchema).min(3).max(10),
  review: z.array(quizQuestionSchema).min(1).max(2),
});

export const courseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  order: z.number().int(),
  required: z.boolean(),
  locale: grimoireLocaleSchema,
  version: z.number().int(),
  title: text(50),
  subtitle: text(60),
  description: text(260),
  icon: iconName,
  badge: z.object({ name: text(40), icon: iconName, description: text(140) }),
  tags: z.array(z.string()),
  lessons: z.array(lessonSchema).min(3).max(8),
  quiz: z.array(quizQuestionSchema).length(5),
});

export const catalogSchema = z.object({
  version: z.number().int(),
  courses: z.array(
    z.object({
      slug: z.string().regex(/^[a-z0-9-]+$/),
      order: z.number().int(),
      required: z.boolean(),
      locales: z.array(grimoireLocaleSchema).min(1),
    }),
  ),
});

export type Course = z.infer<typeof courseSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type Card = z.infer<typeof cardSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type CatalogEntry = z.infer<typeof catalogSchema>['courses'][number];
