'use server';

import { z } from 'zod';
import { SignContentKind, UserContentKind } from '@prisma/client';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { MIN_YEAR, monthKey, weekStartOf } from '@/lib/weeks';
import { ensureNatalChart } from '@/lib/astro/ensureNatalChart';
import { aiWindow, getRituals } from '@/lib/ai/queries';
import { allowAiRequest } from '@/lib/ratelimit';
import { saveWeekPatch } from '@/lib/week/save';
import { sendSafely, userEvents } from '@/inngest/client';
import { PROMPT_VERSION } from '@/lib/ai/prompts/system';

export type AiActionResult = { ok: true } | { ok: false; error: string };
export type AddRitualResult = { ok: true; weekStart: DateISO; alreadyAdded: boolean } | { ok: false; error: string };

const dateIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const requestSchema = z.object({
  kind: z.union([z.nativeEnum(SignContentKind), z.nativeEnum(UserContentKind)]),
  periodStart: dateIso,
});

/**
 * Pede (assincronamente, via Inngest) a geração de um conteúdo em falta. Idempotente do lado do Inngest;
 * 10 pedidos/hora por utilizador; só para o período actual ou o seguinte (nunca retroactivo).
 * O conteúdo partilhado usa o signo solar natal e a língua actual.
 */
export async function requestAiContent(kind: string, periodStart: string): Promise<AiActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const userId = session.user.id;

  const parsed = requestSchema.safeParse({ kind, periodStart });
  if (!parsed.success) return { ok: false, error: 'reading.errors.invalid' };
  const req = parsed.data;

  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true, timezone: true } });
  if (!user) return { ok: false, error: 'common.errors.unauthorized' };
  if (aiWindow(req.kind, req.periodStart, todayInTz(user.timezone)) !== 'open') return { ok: false, error: 'reading.errors.invalid' };
  if (!(await allowAiRequest(userId))) return { ok: false, error: 'reading.errors.rateLimited' };

  if (req.kind in SignContentKind) {
    const chart = await ensureNatalChart(userId);
    if (!chart) return { ok: false, error: 'reading.errors.invalid' };
    const sent = await sendSafely([
      {
        name: 'ai/sign.generate',
        data: { kind: req.kind as SignContentKind, periodStart: req.periodStart, sign: chart.bodies.SUN.sign, locale: user.locale, version: PROMPT_VERSION },
      },
    ]);
    return sent ? { ok: true } : { ok: false, error: 'reading.errors.unavailable' };
  }

  const sent = await sendSafely(userEvents(userId, user.locale, [{ kind: req.kind as UserContentKind, periodStart: req.periodStart }]));
  return sent ? { ok: true } : { ok: false, error: 'reading.errors.unavailable' };
}

const addRitualSchema = z.object({
  year: z.number().int().min(MIN_YEAR).max(9999),
  month: z.number().int().min(1).max(12),
  ritualId: z.string().min(1).max(120),
});

const NOTE_MAX = 1000;

/**
 * Acrescenta o ritual à nota do dia na semana correspondente (`✦ {title} ({duration} min)`), se ainda
 * não estiver lá. Reutiliza a transacção de `patchWeek`. Não dá Glow por si.
 */
export async function addRitualToWeek(year: number, month: number, ritualId: string): Promise<AddRitualResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const userId = session.user.id;

  const parsed = addRitualSchema.safeParse({ year, month, ritualId });
  if (!parsed.success) return { ok: false, error: 'reading.errors.invalid' };

  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true } });
  if (!user) return { ok: false, error: 'common.errors.unauthorized' };

  const rituals = await getRituals(userId, user.locale, `${monthKey(parsed.data.year, parsed.data.month)}-01`);
  const ritual = rituals?.rituals.find((r) => r.id === parsed.data.ritualId);
  if (!ritual) return { ok: false, error: 'reading.errors.ritualNotFound' };

  const weekStart = weekStartOf(ritual.date);
  const line = `✦ ${ritual.title} (${ritual.durationMinutes} min)`;
  const week = await db.week.findUnique({
    where: { userId_startDate: { userId, startDate: toDbDate(weekStart) } },
    select: { dayNotes: { where: { date: toDbDate(ritual.date) }, select: { text: true } } },
  });
  const current = week?.dayNotes[0]?.text ?? '';
  if (current.split('\n').includes(line)) return { ok: true, weekStart, alreadyAdded: true };

  const text = current.trim() ? `${current.replace(/\s+$/, '')}\n${line}` : line;
  if (text.length > NOTE_MAX) return { ok: false, error: 'reading.errors.noteFull' };

  await saveWeekPatch(userId, weekStart, { dayNotes: [{ date: ritual.date, text }] });
  return { ok: true, weekStart, alreadyAdded: false };
}
