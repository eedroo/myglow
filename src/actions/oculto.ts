'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { toDbDate } from '@/lib/dates';
import { getOculto } from '@/lib/oculto/server';
import { evaluateWeek, nextWeek, type WeekReview } from '@/lib/oculto/rules';

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const optText = z.string().trim().max(2000).optional().transform((v) => (v ? v : null));
const sessionSchema = z.object({
  week: z.number().int().min(1),
  day: z.number().int().min(1).max(5),
  actualSec: z.number().int().min(0).max(4 * 3600),
  concentration: z.number().int().min(1).max(10),
  difficulty: optText,
  notes: optText,
  experience: optText,
  interpretation: optText,
  evidence: optText,
  dream: optText,
});

const refresh = () => {
  revalidatePath('/oculto', 'layout');
  revalidatePath('/today');
};

/** Grimório Oculto: grava uma sessão no fim (o diário do treino). Só a próxima sessão da semana actual, uma por dia. */
export async function saveOcultoSession(input: z.input<typeof sessionSchema>): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const userId = session.user.id;
  const p = sessionSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'oculto.errors.invalid' };
  const state = await getOculto(userId);
  if (!state || !state.content) return { ok: false, error: 'oculto.errors.unavailable' };
  if (p.data.week !== state.week || p.data.day !== state.status.next || !state.status.canPractice) return { ok: false, error: 'oculto.errors.notToday' };
  const def = state.content.sessions.find((s) => s.day === p.data.day)!;
  const { week, day, ...fields } = p.data;
  const date = toDbDate(state.today);
  const create = db.ocultoSession.create({
    data: { userId, week, attempt: state.attempt, day, date, plannedSec: def.mainMinutes * 60, ...fields },
  });
  // Semana dos sonhos: o sonho escrito no diário do treino é o mesmo da Manhã do Hoje.
  if (state.content.dreamJournal && fields.dream) {
    const text = fields.dream;
    await db.$transaction([create, db.ocultoDream.upsert({ where: { userId_date: { userId, date } }, create: { userId, date, text }, update: { text } })]);
  } else {
    await create;
  }
  refresh();
  return { ok: true, data: undefined };
}

/**
 * Avaliação automática da semana pelo diário do treino: avança para a semana seguinte ou repete (nova tentativa,
 * sem perder os registos anteriores). Na última semana escrita, avança só quando a seguinte existir.
 */
export async function reviewOcultoWeek(): Promise<Result<WeekReview & { nextWeek: number | null }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const userId = session.user.id;
  const state = await getOculto(userId);
  if (!state || !state.content) return { ok: false, error: 'oculto.errors.unavailable' };
  if (!state.status.reviewReady) return { ok: false, error: 'oculto.errors.reviewNotReady' };
  const review = evaluateWeek(state.content, state.logs);
  const next = review.result === 'ADVANCE' ? nextWeek(state.week, state.available) : null;
  await db.$transaction([
    db.ocultoReview.upsert({
      where: { userId_week_attempt: { userId, week: state.week, attempt: state.attempt } },
      create: { userId, week: state.week, attempt: state.attempt, result: review.result, reasons: review.reasons },
      update: { result: review.result, reasons: review.reasons },
    }),
    ...(review.result === 'REPEAT'
      ? [db.ocultoProgress.update({ where: { userId }, data: { attempt: state.attempt + 1, weekStartedAt: new Date() } })]
      : next
        ? [db.ocultoProgress.update({ where: { userId }, data: { week: next, attempt: 1, weekStartedAt: new Date() } })]
        : []),
  ]);
  refresh();
  return { ok: true, data: { ...review, nextWeek: next } };
}

const dreamSchema = z.object({ text: z.string().trim().max(2000) });

/**
 * Sonho de hoje, escrito na Manhã do Hoje (semanas com `dreamJournal`). Também actualiza a sessão de hoje do treino,
 * se já foi feita, para que o diário e o Hoje mostrem o mesmo texto. Texto vazio apaga.
 */
export async function saveOcultoDream(input: z.input<typeof dreamSchema>): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const userId = session.user.id;
  const p = dreamSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'oculto.errors.invalid' };
  const state = await getOculto(userId);
  if (!state?.content?.dreamJournal) return { ok: false, error: 'oculto.errors.unavailable' };
  const date = toDbDate(state.today);
  const text = p.data.text;
  await db.$transaction([
    text
      ? db.ocultoDream.upsert({ where: { userId_date: { userId, date } }, create: { userId, date, text }, update: { text } })
      : db.ocultoDream.deleteMany({ where: { userId, date } }),
    db.ocultoSession.updateMany({ where: { userId, week: state.week, attempt: state.attempt, date }, data: { dream: text || null } }),
  ]);
  refresh();
  return { ok: true, data: undefined };
}
