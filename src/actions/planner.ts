'use server';

import type { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { toDbDate, todayInTz } from '@/lib/dates';
import { MAX_MONTHS_AHEAD, MAX_YEARS_AHEAD, MIN_YEAR, addMonths, monthKey, monthOf } from '@/lib/weeks';
import { monthPatchSchema, yearPatchSchema } from '@/lib/validation/planner';
import type { MonthPatch, ProjectsPatch, YearPatch } from '@/types/planner';

export type PatchPlanResult = { ok: true; updatedAt: string } | { ok: false; error: string };

const emptyToNull = (v: string | undefined) => (v === undefined ? undefined : v.trim() === '' ? null : v);

async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({ where: { id: session.user.id }, select: { id: true, timezone: true } });
}

/** Upsert/delete das metas por projecto de um período (texto vazio → delete). */
async function saveProjects(
  tx: Prisma.TransactionClient,
  userId: string,
  period: 'MONTH' | 'YEAR',
  periodStart: Date,
  projects: ProjectsPatch | undefined,
) {
  for (const project of projects ?? []) {
    const where = { userId, period, periodStart, area: project.area };
    if (project.text.trim() === '') {
      await tx.projectIntention.deleteMany({ where });
    } else {
      await tx.projectIntention.upsert({
        where: { userId_period_periodStart_area: where },
        create: { ...where, text: project.text },
        update: { text: project.text },
      });
    }
  }
}

/** Planner mensal: meses desde 2000-01 até 12 meses à frente. */
export async function patchMonth(year: number, month: number, patch: MonthPatch): Promise<PatchPlanResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: 'common.errors.unauthorized' };

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || year < MIN_YEAR) {
    return { ok: false, error: 'planner.errors.invalidPeriod' };
  }
  const now = monthOf(todayInTz(user.timezone));
  const limit = addMonths(now.year, now.month, MAX_MONTHS_AHEAD);
  if (monthKey(year, month) > monthKey(limit.year, limit.month)) return { ok: false, error: 'planner.errors.tooFar' };

  const parsed = monthPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: 'planner.errors.invalid' };
  const p = parsed.data;
  const fields = { intention: emptyToNull(p.intention), reflection: emptyToNull(p.reflection) };

  const row = await db.$transaction(async (tx) => {
    const m = await tx.month.upsert({
      where: { userId_year_month: { userId: user.id, year, month } },
      create: { userId: user.id, year, month, ...fields },
      update: { ...fields, updatedAt: new Date() },
    });
    await saveProjects(tx, user.id, 'MONTH', toDbDate(`${monthKey(year, month)}-01`), p.projects);
    return m;
  });
  return { ok: true, updatedAt: row.updatedAt.toISOString() };
}

/** Planner anual: anos desde 2000 até ao próximo. */
export async function patchYear(year: number, patch: YearPatch): Promise<PatchPlanResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: 'common.errors.unauthorized' };

  const currentYear = Number(todayInTz(user.timezone).slice(0, 4));
  if (!Number.isInteger(year) || year < MIN_YEAR) return { ok: false, error: 'planner.errors.invalidPeriod' };
  if (year > currentYear + MAX_YEARS_AHEAD) return { ok: false, error: 'planner.errors.tooFar' };

  const parsed = yearPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: 'planner.errors.invalid' };
  const p = parsed.data;
  const fields = {
    word: emptyToNull(p.word),
    intention: emptyToNull(p.intention),
    reflection: emptyToNull(p.reflection),
  };

  const row = await db.$transaction(async (tx) => {
    const y = await tx.year.upsert({
      where: { userId_year: { userId: user.id, year } },
      create: { userId: user.id, year, ...fields },
      update: { ...fields, updatedAt: new Date() },
    });
    await saveProjects(tx, user.id, 'YEAR', toDbDate(`${year}-01-01`), p.projects);
    return y;
  });
  return { ok: true, updatedAt: row.updatedAt.toISOString() };
}
