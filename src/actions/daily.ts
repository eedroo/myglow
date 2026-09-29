'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { compareDates, isDateISO, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { getDailyMoon } from '@/lib/astro/moon';
import { dailyPatchSchema } from '@/lib/validation/daily';
import { DAILY_TEXT_FIELDS, type DailyPatch } from '@/types/daily';
import { computeDayProgress } from '@/lib/daily/progress';
import { dayCandidates } from '@/lib/xp/rules';
import { safeAwardXp, type XpResult } from '@/lib/xp/award';

export type PatchDailyResult = { ok: true; updatedAt: string; xp?: XpResult } | { ok: false; error: string };

const MIN_DATE: DateISO = '2000-01-01';

/**
 * Grava um patch parcial da entrada do diário. Hoje e dias passados são editáveis; futuros não.
 * No `create` grava um snapshot da fase e do signo da lua desse dia.
 */
export async function patchDailyEntry(date: DateISO, patch: DailyPatch): Promise<PatchDailyResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };

  if (typeof date !== 'string' || !isDateISO(date) || compareDates(date, MIN_DATE) < 0) {
    return { ok: false, error: 'day.errors.invalidDate' };
  }

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });
  if (!user) return { ok: false, error: 'common.errors.unauthorized' };
  const today = todayInTz(user.timezone);
  if (compareDates(date, today) > 0) return { ok: false, error: 'day.errors.futureDate' };

  const parsed = dailyPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: 'day.errors.invalid' };

  const data: Record<string, unknown> = { ...parsed.data };
  for (const key of DAILY_TEXT_FIELDS) {
    if (typeof data[key] === 'string' && (data[key] as string).trim() === '') data[key] = null;
  }

  const userId = session.user.id;
  const dbDate = toDbDate(date);
  const existing = await db.dailyEntry.findUnique({
    where: { userId_date: { userId, date: dbDate } },
    select: { id: true },
  });

  const row = existing
    ? await db.dailyEntry.update({ where: { id: existing.id }, data })
    : await (async () => {
        const moon = getDailyMoon(date, user.timezone);
        return db.dailyEntry.upsert({
          where: { userId_date: { userId, date: dbDate } },
          create: { userId, date: dbDate, moonPhase: moon.phase, moonSign: moon.signAtNoon, ...data },
          update: data,
        });
      })();

  // Glow: avaliado depois de gravar; nunca faz falhar a gravação.
  const xp = await safeAwardXp(
    userId,
    () => dayCandidates({ date, progress: computeDayProgress(date, row), now: new Date(), tz: user.timezone }),
    { tz: user.timezone, today },
  );
  return { ok: true, updatedAt: row.updatedAt.toISOString(), ...(xp && { xp }) };
}
