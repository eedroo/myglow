'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { toDbDate } from '@/lib/dates';
import { getOculto } from '@/lib/oculto/server';
import { evaluateWeek, nextWeek, type WeekReview } from '@/lib/oculto/rules';
import { GLYPH_LIMIT, strokesSchema } from '@/lib/oculto/glyph';
import { randomInt } from 'node:crypto';

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
      ? [db.ocultoProgress.update({ where: { userId }, data: { attempt: state.attempt + 1, weekStartedAt: new Date(), belief: null } })]
      : next
        ? [db.ocultoProgress.update({ where: { userId }, data: { week: next, attempt: 1, weekStartedAt: new Date(), belief: null } })]
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

/** Semana da crença aleatória: lança o dado (no servidor), uma vez por semana e tentativa. Devolve o índice. */
export async function rollOcultoBelief(): Promise<Result<{ belief: number }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const userId = session.user.id;
  const state = await getOculto(userId);
  const faces = state?.content?.beliefs;
  if (!state || !faces) return { ok: false, error: 'oculto.errors.unavailable' };
  if (state.belief !== null) return { ok: true, data: { belief: state.belief } };
  const belief = randomInt(faces.length);
  // Só grava se ainda não havia crença (dois toques ao mesmo tempo ficam com a primeira).
  const r = await db.ocultoProgress.updateMany({ where: { userId, week: state.week, attempt: state.attempt, belief: null }, data: { belief } });
  if (r.count === 0) {
    const p = await db.ocultoProgress.findUnique({ where: { userId }, select: { belief: true } });
    if (p?.belief == null) return { ok: false, error: 'oculto.errors.invalid' };
    refresh();
    return { ok: true, data: { belief: p.belief } };
  }
  refresh();
  return { ok: true, data: { belief } };
}

const glyphSchema = z.object({
  id: z.string().min(1).max(40).optional(),
  name: z.string().trim().min(1).max(40),
  meaning: z.string().trim().max(300).optional().transform((v) => (v ? v : null)),
  strokes: strokesSchema,
});

/** Alfabeto do Desejo: cria ou edita um símbolo (só a partir da semana do alfabeto; até GLYPH_LIMIT). */
export async function saveOcultoGlyph(input: z.input<typeof glyphSchema>): Promise<Result<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const userId = session.user.id;
  const p = glyphSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'oculto.errors.invalid' };
  const state = await getOculto(userId);
  if (!state?.alphabetOpen) return { ok: false, error: 'oculto.errors.unavailable' };
  const { id, name, meaning, strokes } = p.data;
  if (id) {
    const r = await db.ocultoGlyph.updateMany({ where: { id, userId }, data: { name, meaning, strokes } });
    if (r.count === 0) return { ok: false, error: 'oculto.errors.invalid' };
    refresh();
    return { ok: true, data: { id } };
  }
  if (state.glyphs.length >= GLYPH_LIMIT) return { ok: false, error: 'oculto.errors.glyphLimit' };
  const g = await db.ocultoGlyph.create({ data: { userId, name, meaning, strokes }, select: { id: true } });
  refresh();
  return { ok: true, data: { id: g.id } };
}

/** Alfabeto do Desejo: apaga um símbolo da própria pessoa. */
export async function deleteOcultoGlyph(id: string): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const p = z.string().min(1).max(40).safeParse(id);
  if (!p.success) return { ok: false, error: 'oculto.errors.invalid' };
  await db.ocultoGlyph.deleteMany({ where: { id: p.data, userId: session.user.id } });
  refresh();
  return { ok: true, data: undefined };
}

const paraText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const paradigmSchema = z.object({
  name: paraText(80),
  premises: paraText(3000),
  symbols: z.array(z.string().min(1).max(40)).max(GLYPH_LIMIT).default([]),
  practices: paraText(3000),
  limits: paraText(3000),
});

/** Paradigma pessoal (Fase V em diante): grava o texto e os símbolos escolhidos (só do próprio alfabeto). */
export async function saveOcultoParadigm(input: z.input<typeof paradigmSchema>): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const userId = session.user.id;
  const p = paradigmSchema.safeParse(input);
  if (!p.success) return { ok: false, error: 'oculto.errors.invalid' };
  const state = await getOculto(userId);
  if (!state?.paradigmOpen) return { ok: false, error: 'oculto.errors.unavailable' };
  const own = new Set(state.glyphs.map((g) => g.id));
  const data = { ...p.data, symbols: [...new Set(p.data.symbols)].filter((id) => own.has(id)) };
  await db.ocultoParadigm.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  refresh();
  return { ok: true, data: undefined };
}
