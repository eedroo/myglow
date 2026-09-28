import 'server-only';
import type { DailyEntry } from '@prisma/client';
import { db } from '@/lib/db';
import { toDbDate, type DateISO } from '@/lib/dates';
import { emptyDailyEntry, type DailyEntryData } from '@/types/daily';

export function toDailyEntryData(date: DateISO, row: DailyEntry | null): DailyEntryData {
  const empty = emptyDailyEntry(date);
  if (!row) return empty;
  return {
    date,
    intention: row.intention ?? '',
    morningBanishName: row.morningBanishName ?? '',
    morningBanishDone: row.morningBanishDone,
    morningRitualDone: row.morningRitualDone,
    sleepGoalMet: row.sleepGoalMet,
    wakeMood: row.wakeMood,
    wakeNote: row.wakeNote ?? '',
    stretchDone: row.stretchDone,
    workoutDone: row.workoutDone,
    waterDone: row.waterDone,
    nightBanishName: row.nightBanishName ?? '',
    nightBanishDone: row.nightBanishDone,
    nightRitualDone: row.nightRitualDone,
    gratitude: row.gratitude ?? '',
    mood: row.mood,
    reflection: row.reflection ?? '',
    summary: row.summary ?? '',
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Entrada do diário para o dia; valores vazios se ainda não existir (não cria). */
export async function getDailyEntry(userId: string, date: DateISO): Promise<DailyEntryData> {
  const row = await db.dailyEntry.findUnique({ where: { userId_date: { userId, date: toDbDate(date) } } });
  return toDailyEntryData(date, row);
}
