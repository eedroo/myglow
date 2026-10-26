'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { addDays, compareDates, fromDbDate, isDateISO, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { requireFeature } from '@/lib/entitlements/server';
import { hasGuideConsent } from '@/lib/guide/consent';
import { parseKgToGrams } from '@/lib/weight';
import { GOAL_RATES, WEIGHT_LIMITS, weekAverage } from '@/lib/body/weight';
import { weekStartOf } from '@/lib/weeks';

/**
 * Corpo II (F17): peso diário, objectivo, lembrete de pesagem e o Guia a ler o corpo. Todas com
 * `requireFeature('body-pro')` e Zod; as do peso exigem o consentimento de bem-estar (Fase 9).
 */
export type BodyResult = { ok: true } | { ok: false; error: string };

const ok = (): BodyResult => ({ ok: true });
const fail = (error = 'common.errors.generic'): BodyResult => ({ ok: false, error });

async function access(needConsent: boolean): Promise<{ uid: string; tz: string } | BodyResult> {
  const s = await auth();
  if (!s?.user?.id) return fail('common.errors.unauthorized');
  await requireFeature(s.user.id, 'body-pro');
  const u = await db.user.findUnique({ where: { id: s.user.id }, select: { timezone: true, wellbeingConsentAt: true } });
  if (!u) return fail('common.errors.unauthorized');
  if (needConsent && !u.wellbeingConsentAt) return fail('body.errors.consent');
  return { uid: s.user.id, tz: u.timezone };
}

const refresh = () => {
  revalidatePath('/body', 'layout');
  revalidatePath('/week', 'layout');
};

const dateSchema = z.string().refine((v) => isDateISO(v), 'date');

/** Peso de um dia (hoje ou até 365 dias atrás); o último registo do dia substitui. */
export async function logWeight(input: { date: string; kg: string }): Promise<BodyResult> {
  const a = await access(true);
  if ('ok' in a) return a;
  const p = z.object({ date: dateSchema, kg: z.string().max(10) }).safeParse(input);
  if (!p.success) return fail('body.errors.weight');
  const today = todayInTz(a.tz);
  const date = p.data.date as DateISO;
  if (compareDates(date, today) > 0 || compareDates(date, addDays(today, -WEIGHT_LIMITS.maxDaysBack)) < 0) return fail('body.errors.date');
  let grams: number | null;
  try {
    grams = parseKgToGrams(p.data.kg);
  } catch {
    return fail('body.errors.weight');
  }
  if (grams === null || grams < WEIGHT_LIMITS.minGrams || grams > WEIGHT_LIMITS.maxGrams) return fail('body.errors.weight');
  await db.bodyWeightEntry.upsert({
    where: { userId_date: { userId: a.uid, date: toDbDate(date) } },
    create: { userId: a.uid, date: toDbDate(date), grams },
    update: { grams },
  });
  refresh();
  return ok();
}

export async function deleteWeight(date: string): Promise<BodyResult> {
  const a = await access(true);
  if ('ok' in a) return a;
  if (!dateSchema.safeParse(date).success) return fail();
  await db.bodyWeightEntry.deleteMany({ where: { userId: a.uid, date: toDbDate(date) } });
  refresh();
  return ok();
}

const goalSchema = z.object({
  direction: z.enum(['GAIN', 'MAINTAIN', 'LOSE']),
  weeklyRateGrams: z.number().int(),
  targetKg: z.string().max(10).nullable().optional(),
});

/** Objectivo escolhido pela pessoa; ritmo só entre as opções de `GOAL_RATES`. Começa na média desta semana. */
export async function setBodyGoal(input: z.input<typeof goalSchema>): Promise<BodyResult> {
  const a = await access(true);
  if ('ok' in a) return a;
  const p = goalSchema.safeParse(input);
  if (!p.success) return fail('body.errors.goal');
  const rates: readonly number[] = GOAL_RATES[p.data.direction];
  if (!rates.includes(p.data.weeklyRateGrams)) return fail('body.errors.goal');
  let targetGrams: number | null = null;
  if (p.data.targetKg?.trim() && p.data.direction !== 'MAINTAIN') {
    try {
      targetGrams = parseKgToGrams(p.data.targetKg);
    } catch {
      return fail('body.errors.weight');
    }
    if (targetGrams === null || targetGrams < WEIGHT_LIMITS.minGrams || targetGrams > WEIGHT_LIMITS.maxGrams) return fail('body.errors.weight');
  }
  const today = todayInTz(a.tz);
  const recent = await db.bodyWeightEntry.findMany({
    where: { userId: a.uid, date: { gte: toDbDate(weekStartOf(today)) } },
    select: { date: true, grams: true },
  });
  const avg = weekAverage(recent.map((r) => ({ date: fromDbDate(r.date), grams: r.grams })), weekStartOf(today));
  const last = avg ?? (await db.bodyWeightEntry.findFirst({ where: { userId: a.uid }, orderBy: { date: 'desc' }, select: { grams: true } }))?.grams;
  if (last == null) return fail('body.errors.noWeight');
  const data = { direction: p.data.direction, weeklyRateGrams: p.data.weeklyRateGrams, targetGrams, startGrams: last, startedAt: new Date() };
  await db.bodyGoal.upsert({ where: { userId: a.uid }, create: { userId: a.uid, ...data }, update: data });
  refresh();
  return ok();
}

export async function clearBodyGoal(): Promise<BodyResult> {
  const a = await access(false);
  if ('ok' in a) return a;
  await db.bodyGoal.deleteMany({ where: { userId: a.uid } });
  refresh();
  return ok();
}

export async function setWeighInReminder(enabled: boolean, time: string): Promise<BodyResult> {
  const a = await access(enabled);
  if ('ok' in a) return a;
  const p = z.object({ enabled: z.boolean(), time: z.string().regex(/^([01]\d|2[0-3]):(00|15|30|45)$/) }).safeParse({ enabled, time });
  if (!p.success) return fail();
  const data = { weighInReminder: p.data.enabled, weighInTime: p.data.time };
  await db.fitnessPrefs.upsert({ where: { userId: a.uid }, create: { userId: a.uid, ...data }, update: data });
  refresh();
  return ok();
}

/** O Guia passa a ler o corpo (médias, objectivo, treinos). Ligar exige o consentimento do Guia em vigor. */
export async function setGuideIncludeBody(value: boolean): Promise<BodyResult> {
  const a = await access(false);
  if ('ok' in a) return a;
  if (typeof value !== 'boolean') return fail();
  if (value) {
    const u = await db.user.findUnique({ where: { id: a.uid }, select: { guideConsentAt: true, guideConsentVersion: true, wellbeingConsentAt: true } });
    if (!u || !hasGuideConsent(u)) return fail('body.errors.guideConsent');
    if (!u.wellbeingConsentAt) return fail('body.errors.consent');
  }
  await db.user.update({ where: { id: a.uid }, data: { guideIncludeBody: value } });
  refresh();
  revalidatePath('/guide', 'layout');
  return ok();
}
