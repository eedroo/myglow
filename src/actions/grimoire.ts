'use server';

import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { addDays, toDbDate, todayInTz } from '@/lib/dates';
import { XP_POINTS } from '@/lib/xp/rules';
import { safeAwardXp, type XpResult } from '@/lib/xp/award';
import { LOCALE_COOKIE_OPTIONS } from '@/i18n/locales';
import type { MagicIconName } from '@/lib/icons';
import { contentPrefsFor, getLessonPlayerData, getQuizData, publishedCourses, READ_PT_COOKIE } from '@/lib/grimoire/queries';
import { lessonsLeftToday, nextReview, quizPassed } from '@/lib/grimoire/rules';

export type CompleteLessonResult =
  | { ok: true; lessonsLeftToday: number; nextLesson: string | null; quizUnlocked: boolean }
  | { ok: false; error: string };

export type SubmitQuizResult =
  | {
      ok: true;
      score: number;
      passed: boolean;
      results: { questionId: string; correct: boolean; correctOptionId: string }[];
      xp?: XpResult;
      badge?: { name: string; icon: MagicIconName; description: string };
    }
  | { ok: false; error: string };

const slug = z.string().regex(/^[a-z0-9-]+$/).max(80);
const completeSchema = z.object({
  courseSlug: slug,
  lessonSlug: slug,
  reviewAnswers: z.array(z.object({ itemId: z.string().min(1).max(40), correct: z.boolean() })).max(4),
});

async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({ where: { id: session.user.id }, select: { id: true, timezone: true, locale: true } });
}

/**
 * Conclui uma lição: se for nova, regista o progresso (conta para o limite diário) e agenda as perguntas de
 * revisão para amanhã; em qualquer caso aplica as respostas às revisões mostradas no início (Leitner).
 */
export async function completeLesson(
  courseSlug: string,
  lessonSlug: string,
  reviewAnswers: { itemId: string; correct: boolean }[],
): Promise<CompleteLessonResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = completeSchema.safeParse({ courseSlug, lessonSlug, reviewAnswers });
  if (!parsed.success) return { ok: false, error: 'grimoire.errors.invalid' };

  const prefs = contentPrefsFor(user.locale);
  const res = await getLessonPlayerData(user.id, courseSlug, lessonSlug, user.timezone, prefs);
  if ('notice' in res) return { ok: false, error: `grimoire.notice.${res.notice}` };
  const { data } = res;
  const today = todayInTz(user.timezone);

  if (data.mode === 'new') {
    try {
      await db.$transaction(async (tx) => {
        await tx.lessonProgress.create({ data: { userId: user.id, courseSlug, lessonSlug, completedDate: toDbDate(today) } });
        await tx.courseProgress.upsert({ where: { userId_courseSlug: { userId: user.id, courseSlug } }, create: { userId: user.id, courseSlug }, update: {} });
        await tx.reviewItem.createMany({
          data: data.lesson.review.map((q) => ({
            userId: user.id, courseSlug, lessonSlug, questionId: q.id, dueDate: toDbDate(addDays(today, 1)), box: 0,
          })),
          skipDuplicates: true,
        });
      });
    } catch (err) {
      // Duplo clique / dois separadores: a lição já ficou registada.
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
    }
  }

  for (const a of parsed.data.reviewAnswers) {
    const item = await db.reviewItem.findFirst({ where: { id: a.itemId, userId: user.id } });
    if (!item) continue;
    const next = nextReview(item.box, a.correct, today);
    await db.reviewItem.update({ where: { id: item.id }, data: { box: next.box, dueDate: toDbDate(next.dueDate) } });
  }

  const [completedToday, done] = await Promise.all([
    db.lessonProgress.count({ where: { userId: user.id, completedDate: toDbDate(today) } }),
    db.lessonProgress.findMany({ where: { userId: user.id, courseSlug }, select: { lessonSlug: true } }),
  ]);
  revalidatePath('/grimoire'); // o mapa (cache do router) reflecte o progresso ao voltar
  const doneSet = new Set(done.map((d) => d.lessonSlug));
  const course = publishedCourses(prefs).find((p) => p.entry.slug === courseSlug)!.course;
  return {
    ok: true,
    lessonsLeftToday: lessonsLeftToday(completedToday),
    nextLesson: course.lessons.find((l) => !doneSet.has(l.slug))?.slug ?? null,
    quizUnlocked: course.lessons.every((l) => doneSet.has(l.slug)),
  };
}

const quizSchema = z.object({ courseSlug: slug, answers: z.record(z.string().max(40), z.string().max(40)) });

/**
 * Corrige o quiz no servidor. Aprovado (≥ 4/5) pela primeira vez → curso concluído, emblema e 100 Glow
 * (`COURSE_COMPLETE` com `refId` = curso, idempotente). Pode repetir-se; guarda a melhor nota.
 */
export async function submitQuiz(courseSlug: string, answers: Record<string, string>): Promise<SubmitQuizResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = quizSchema.safeParse({ courseSlug, answers });
  if (!parsed.success) return { ok: false, error: 'grimoire.errors.invalid' };

  const res = await getQuizData(user.id, courseSlug, user.timezone, contentPrefsFor(user.locale));
  if ('notice' in res) return { ok: false, error: `grimoire.notice.${res.notice}` };
  const { questions, badge } = res.data;

  const results = questions.map((q) => ({ questionId: q.id, correct: parsed.data.answers[q.id] === q.correct, correctOptionId: q.correct }));
  const score = results.filter((r) => r.correct).length;
  const passed = quizPassed(score);

  const progress = await db.courseProgress.upsert({
    where: { userId_courseSlug: { userId: user.id, courseSlug } },
    create: { userId: user.id, courseSlug, quizAttempts: 1, bestScore: score },
    update: { quizAttempts: { increment: 1 } },
  });
  if ((progress.bestScore ?? -1) < score) {
    await db.courseProgress.update({ where: { id: progress.id }, data: { bestScore: score } });
  }

  revalidatePath('/grimoire');
  revalidatePath('/profile');
  if (!passed) return { ok: true, score, passed, results };

  // Só a primeira aprovação conclui o curso (updateMany com completedAt null evita corridas).
  const firstTime = (await db.courseProgress.updateMany({ where: { id: progress.id, completedAt: null }, data: { completedAt: new Date() } })).count === 1;
  if (!firstTime) return { ok: true, score, passed, results };

  const today = todayInTz(user.timezone);
  const xp = await safeAwardXp(
    user.id,
    () => [{ source: 'COURSE_COMPLETE', periodStart: today, points: XP_POINTS.COURSE_COMPLETE, refId: courseSlug }],
    { tz: user.timezone, today },
  );
  return { ok: true, score, passed, results, badge, ...(xp && { xp }) };
}

/** Utilizadores EN sem conteúdo em inglês: ler o Grimório em português (cookie). */
export async function setReadInPortuguese(on: boolean): Promise<{ ok: true }> {
  if (on) cookies().set(READ_PT_COOKIE, '1', LOCALE_COOKIE_OPTIONS);
  else cookies().delete(READ_PT_COOKIE);
  revalidatePath('/grimoire');
  return { ok: true };
}

