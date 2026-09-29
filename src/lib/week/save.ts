import 'server-only';
import type { Week } from '@prisma/client';
import { db } from '@/lib/db';
import { toDbDate, type DateISO } from '@/lib/dates';
import { weekKey } from '@/lib/weeks';
import type { WeekPatchInput } from '@/lib/validation/week';

const emptyToNull = (v: string | undefined) => (v === undefined ? undefined : v.trim() === '' ? null : v);

/**
 * Grava um patch (já validado) da semana numa só transacção: `Week`, notas dos dias e intenções por projecto.
 * O registo só é criado na primeira gravação. Usado por `patchWeek` e `addRitualToWeek`.
 */
export async function saveWeekPatch(userId: string, start: DateISO, p: WeekPatchInput): Promise<Week> {
  const key = weekKey(start);
  const startDate = toDbDate(start);
  const fields = {
    title: emptyToNull(p.title),
    intention: emptyToNull(p.intention),
    reflection: emptyToNull(p.reflection),
    weightGrams: p.weightGrams,
  };

  return db.$transaction(async (tx) => {
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
}
