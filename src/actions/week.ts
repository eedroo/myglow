'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { compareDates, isDateISO, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { MAX_WEEKS_AHEAD, isSunday, weekDays, weekStartOf, weeksBetween } from '@/lib/weeks';
import { saveWeekPatch } from '@/lib/week/save';
import { weekPatchSchema } from '@/lib/validation/week';
import type { WeekPatch } from '@/types/week';
import { weekCandidates } from '@/lib/xp/rules';
import { safeAwardXp, type XpResult } from '@/lib/xp/award';

export type PatchWeekResult = { ok: true; updatedAt: string; xp?: XpResult } | { ok: false; error: string };

const MIN_DATE: DateISO = '2000-01-01';

/**
 * Grava um patch parcial da semana (transacção em `saveWeekPatch`).
 * Semanas passadas, actual e futuras (até 52) são editáveis. O registo só é criado na primeira gravação.
 */
export async function patchWeek(start: DateISO, patch: WeekPatch): Promise<PatchWeekResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const userId = session.user.id;

  if (typeof start !== 'string' || !isDateISO(start) || !isSunday(start) || compareDates(start, MIN_DATE) < 0) {
    return { ok: false, error: 'week.errors.invalidWeek' };
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  if (!user) return { ok: false, error: 'common.errors.unauthorized' };
  if (weeksBetween(weekStartOf(todayInTz(user.timezone)), start) > MAX_WEEKS_AHEAD) {
    return { ok: false, error: 'week.errors.tooFar' };
  }

  const parsed = weekPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: 'week.errors.invalid' };
  const p = parsed.data;

  const days = new Set(weekDays(start));
  if (p.dayNotes?.some((n) => !days.has(n.date))) return { ok: false, error: 'week.errors.invalid' };

  const startDate = toDbDate(start);
  const week = await saveWeekPatch(userId, start, p);

  const today = todayInTz(user.timezone);
  const xp = await safeAwardXp(
    userId,
    async () =>
      weekCandidates({
        start,
        intention: week.intention ?? '',
        projectsFilled: await db.projectIntention.count({ where: { userId, period: 'WEEK', periodStart: startDate } }),
        reflection: week.reflection ?? '',
        now: new Date(),
        tz: user.timezone,
      }),
    { tz: user.timezone, today },
  );
  return { ok: true, updatedAt: week.updatedAt.toISOString(), ...(xp && { xp }) };
}
