'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { compareDates, isDateISO, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { MAX_WEEKS_AHEAD, isSunday, weekDays, weekKey, weekStartOf, weeksBetween } from '@/lib/weeks';
import { weekPatchSchema } from '@/lib/validation/week';
import type { WeekPatch } from '@/types/week';

export type PatchWeekResult = { ok: true; updatedAt: string } | { ok: false; error: string };

const MIN_DATE: DateISO = '2000-01-01';

const emptyToNull = (v: string | undefined) => (v === undefined ? undefined : v.trim() === '' ? null : v);

/**
 * Grava um patch parcial da semana numa só transacção: `Week`, notas dos dias e intenções por projecto.
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

  const key = weekKey(start);
  const startDate = toDbDate(start);
  const fields = {
    title: emptyToNull(p.title),
    intention: emptyToNull(p.intention),
    reflection: emptyToNull(p.reflection),
    weightGrams: p.weightGrams,
  };

  const week = await db.$transaction(async (tx) => {
    const w = await tx.week.upsert({
      where: { userId_startDate: { userId, startDate } },
      create: { userId, startDate, year: key.year, month: key.month, weekOfMonth: key.weekOfMonth, ...fields },
      update: { ...fields, updatedAt: new Date() },
    });

    for (const note of p.dayNotes ?? []) {
      const date = toDbDate(note.date);
      if (note.text.trim() === '') {
        await tx.weekDayNote.deleteMany({ where: { weekId: w.id, date } });
      } else {
        await tx.weekDayNote.upsert({
          where: { weekId_date: { weekId: w.id, date } },
          create: { weekId: w.id, date, text: note.text },
          update: { text: note.text },
        });
      }
    }

    for (const project of p.projects ?? []) {
      const where = { userId, period: 'WEEK' as const, periodStart: startDate, area: project.area };
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
    return w;
  });

  return { ok: true, updatedAt: week.updatedAt.toISOString() };
}
