'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { todayInTz } from '@/lib/dates';
import { guideConsentVersion } from '@/lib/env';
import { requireFeature } from '@/lib/entitlements/server';
import { sendSafely, type GuideGenerateEvent } from '@/inngest/client';
import { allowGuideRequest } from '@/lib/ratelimit';
import { guideGate } from '@/lib/guide/generate';
import { inAutoOpenWindow, previousMonthPeriod, previousWeekPeriod, recapPeriod } from '@/lib/recap/period';

/** Acções do Guia (F14). Todas exigem acesso (`requireFeature`) e sessão; a geração é sempre em Inngest. */
export type GuideActionResult = { ok: true } | { ok: false; error: string };

const periodSchema = z.object({ kind: z.enum(['WEEK', 'MONTH']), periodKey: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/) });
type Kind = 'WEEK' | 'MONTH';

async function session(): Promise<string | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  await requireFeature(s.user.id, 'guide');
  return s.user.id;
}

function parsePeriod(kind: Kind, periodKey: string) {
  const parsed = periodSchema.safeParse({ kind, periodKey });
  if (!parsed.success) return null;
  try {
    return recapPeriod(parsed.data.kind, parsed.data.periodKey);
  } catch {
    return null;
  }
}

const event = (userId: string, kind: Kind, periodKey: string, regenerate: boolean): GuideGenerateEvent => ({
  name: 'guide/generate',
  data: { userId, kind, periodKey, regenerate },
});

/** Activa o Guia. Se o período anterior ainda está na janela da retrospectiva, pede já a leitura. */
export async function giveGuideConsent(accepted: boolean): Promise<GuideActionResult> {
  const userId = await session();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  if (!z.literal(true).safeParse(accepted).success) return { ok: false, error: 'common.errors.generic' };
  const user = await db.user.update({
    where: { id: userId },
    data: { guideConsentAt: new Date(), guideConsentVersion: guideConsentVersion() },
    select: { timezone: true },
  });
  const today = todayInTz(user.timezone);
  const events: GuideGenerateEvent[] = [];
  if (inAutoOpenWindow('WEEK', today)) events.push(event(userId, 'WEEK', previousWeekPeriod(today).key, false));
  if (inAutoOpenWindow('MONTH', today)) events.push(event(userId, 'MONTH', previousMonthPeriod(today).key, false));
  await sendSafely(events);
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Desliga o Guia; com `deleteReports`, apaga também todas as leituras. */
export async function withdrawGuideConsent(deleteReports: boolean): Promise<GuideActionResult> {
  const userId = await session();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = z.boolean().safeParse(deleteReports);
  if (!parsed.success) return { ok: false, error: 'common.errors.generic' };
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { guideConsentAt: null, guideConsentVersion: null } }),
    ...(parsed.data ? [db.guideReport.deleteMany({ where: { userId } })] : []),
  ]);
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Pede a leitura de um período (se ainda não existe, ou se faltavam dias escritos). */
export async function requestGuide(kind: Kind, periodKey: string): Promise<GuideActionResult> {
  const userId = await session();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const period = parsePeriod(kind, periodKey);
  if (!period || !(await guideGate(userId, period.kind, period.key))) return { ok: false, error: 'common.errors.generic' };
  const row = await db.guideReport.findUnique({
    where: { userId_kind_periodKey: { userId, kind: period.kind, periodKey: period.key } },
    select: { status: true },
  });
  if (row && row.status !== 'INSUFFICIENT') return { ok: true };
  if (!(await allowGuideRequest(userId))) return { ok: false, error: 'guide.errors.rateLimited' };
  await sendSafely([event(userId, period.kind, period.key, false)]);
  return { ok: true };
}

/** "Ler de novo com o que escrevi depois" (uma vez por período; a geração confirma). */
export async function regenerateGuide(kind: Kind, periodKey: string): Promise<GuideActionResult> {
  const userId = await session();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const period = parsePeriod(kind, periodKey);
  if (!period || !(await guideGate(userId, period.kind, period.key))) return { ok: false, error: 'common.errors.generic' };
  if (!(await allowGuideRequest(userId))) return { ok: false, error: 'guide.errors.rateLimited' };
  // Sem relatório o ecrã volta a "a preparar" até a nova leitura chegar.
  await sendSafely([event(userId, period.kind, period.key, true)]);
  return { ok: true };
}

export async function markGuideRead(kind: Kind, periodKey: string): Promise<GuideActionResult> {
  const userId = await session();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const period = parsePeriod(kind, periodKey);
  if (!period) return { ok: false, error: 'common.errors.generic' };
  await db.guideReport.updateMany({
    where: { userId, kind: period.kind, periodKey: period.key, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}

export async function rateGuide(kind: Kind, periodKey: string, rating: 1 | -1): Promise<GuideActionResult> {
  const userId = await session();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const period = parsePeriod(kind, periodKey);
  const r = z.union([z.literal(1), z.literal(-1)]).safeParse(rating);
  if (!period || !r.success) return { ok: false, error: 'common.errors.generic' };
  await db.guideReport.updateMany({ where: { userId, kind: period.kind, periodKey: period.key, status: 'READY' }, data: { rating: r.data } });
  return { ok: true };
}
