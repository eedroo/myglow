'use server';

import { revalidatePath } from 'next/cache';
import type { GuidedFlow } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { GUIDED_FLOWS } from '@/lib/guided/flows';

/** Modo guiado (F18): registo de início e fim de cada fluxo (métricas e "abrir sozinho") e a preferência. */
type Result = { ok: true } | { ok: false; error: string };

const KEY_RE: Record<string, RegExp> = {
  DAY: /^\d{4}-\d{2}-\d{2}$/,
  WEEK: /^\d{4}-\d{2}-\d{2}$/,
  MONTH: /^\d{4}-\d{2}$/,
  YEAR: /^\d{4}$/,
};

const runSchema = z
  .object({ flow: z.enum(GUIDED_FLOWS as [GuidedFlow, ...GuidedFlow[]]), periodKey: z.string().max(10) })
  .refine((v) => KEY_RE[v.flow.split('_')[0]!]!.test(v.periodKey));

async function uid(): Promise<string | null> {
  return (await auth())?.user?.id ?? null;
}

export async function guidedStarted(flow: GuidedFlow, periodKey: string): Promise<Result> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const p = runSchema.safeParse({ flow, periodKey });
  if (!p.success) return { ok: false, error: 'common.errors.generic' };
  await db.guidedRun.upsert({
    where: { userId_flow_periodKey: { userId, flow: p.data.flow, periodKey: p.data.periodKey } },
    create: { userId, flow: p.data.flow, periodKey: p.data.periodKey },
    update: {},
  });
  return { ok: true };
}

export async function guidedCompleted(flow: GuidedFlow, periodKey: string): Promise<Result> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const p = runSchema.safeParse({ flow, periodKey });
  if (!p.success) return { ok: false, error: 'common.errors.generic' };
  const now = new Date();
  await db.guidedRun.upsert({
    where: { userId_flow_periodKey: { userId, flow: p.data.flow, periodKey: p.data.periodKey } },
    create: { userId, flow: p.data.flow, periodKey: p.data.periodKey, completedAt: now },
    update: { completedAt: now },
  });
  return { ok: true };
}

export async function setGuidedAutoOpen(value: boolean): Promise<Result> {
  const userId = await uid();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  if (typeof value !== 'boolean') return { ok: false, error: 'common.errors.generic' };
  await db.user.update({ where: { id: userId }, data: { guidedAutoOpen: value } });
  revalidatePath('/settings');
  return { ok: true };
}
