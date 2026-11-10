import 'server-only';
import { db } from '@/lib/db';
import { getEntitlements } from '@/lib/entitlements/server';
import { todayInTz, type DateISO } from '@/lib/dates';
import { addDays, formatTimeInTz, toDbDate } from '@/lib/dates';
import { computeDayProgress, PROGRESS_SELECT, type ProgressEntry } from '@/lib/daily/progress';
import { isWindowOpen, xpWindow } from '@/lib/xp/rules';
import { tourStateFromDb } from '@/lib/tour/machine';
import type { DailyEntryData } from '@/types/daily';
import type { GuidedFlow } from '@prisma/client';
import type { SectionContext } from './sections';
import { autoOpenTarget, earlyHoursSuggestion, isEarlyHours, suggestDayFlow } from './suggest';
import { getJourney } from '@/lib/journey/server';

/** Modo guiado (F18): dados comuns das rotas `/guided/*`. */
export async function guidedUser(userId: string) {
  const [user, ent, journey] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, timezone: true, hemisphere: true, wellbeingConsentAt: true, guidedAutoOpen: true },
    }),
    getEntitlements(userId),
    getJourney(userId),
  ]);
  if (!user) return null;
  // F19: o modo guiado só pede o que está desbloqueado na jornada.
  const ctx: SectionContext = { hasWellbeingConsent: !!user.wellbeingConsentAt, hasBodyPro: !!ent.features['body-pro'], unlocked: journey.sections };
  return { user, ctx, today: todayInTz(user.timezone) as DateISO, firstName: user.name.trim().split(/\s+/)[0] ?? '' };
}

const DEFAULT_TIMES = { morningTime: '08:00', bodyTime: '13:00', nightTime: '21:30' };

/**
 * Hoje e dias passados: base das rotas guiadas (hoje, e ontem enquanto a janela do Glow do dia estiver aberta) e,
 * só hoje, o fluxo sugerido pela hora (escondido com o onboarding guiado activo).
 */
export async function dayGuided(
  userId: string,
  i: { date: DateISO; today: DateISO; tz: string; entry: DailyEntryData; wellbeing: boolean; now?: Date },
): Promise<{ base: string | null; suggested: GuidedFlow | null; suggestedDate?: DateISO }> {
  const now = i.now ?? new Date();
  const allowed = i.date === i.today || (i.date === addDays(i.today, -1) && isWindowOpen(xpWindow('DAY_MORNING', i.date, i.tz), now));
  if (!allowed) return { base: null, suggested: null };
  const base = `/guided/day/${i.date}`;
  if (i.date !== i.today) return { base, suggested: null };
  const [prefs, user, journey] = await Promise.all([
    db.notificationPrefs.findUnique({ where: { userId }, select: { morningTime: true, bodyTime: true, nightTime: true } }),
    db.user.findUnique({ where: { id: userId }, select: { tourStep: true, tourPausedAt: true, tourCompletedAt: true } }),
    getJourney(userId),
  ]);
  if (user && tourStateFromDb(user).status === 'active') return { base, suggested: null };
  const progress = computeDayProgress(i.date, i.entry as unknown as ProgressEntry, { wellbeing: i.wellbeing, available: journey.sections });
  const localTime = formatTimeInTz(now.toISOString(), i.tz);
  const times = prefs ?? DEFAULT_TIMES;
  // Madrugada: em vez da manhã do dia novo, a noite de ontem (se ainda estiver por fazer).
  if (isEarlyHours(localTime, times.morningTime)) {
    const yesterday = addDays(i.today, -1);
    const y = await db.dailyEntry.findUnique({ where: { userId_date: { userId, date: toDbDate(yesterday) } }, select: PROGRESS_SELECT });
    const suggested = earlyHoursSuggestion({
      localTime,
      morningTime: times.morningTime,
      yesterday: computeDayProgress(yesterday, y, { wellbeing: i.wellbeing, available: journey.sections }),
    });
    return { base, suggested, ...(suggested && { suggestedDate: yesterday }) };
  }
  return { base, suggested: suggestDayFlow({ localTime, prefs: times, progress }) };
}

/**
 * Ao entrar no Hoje: o fluxo que abre sozinho (manhã na primeira abertura do dia, a partir das 06:00; noite à hora do
 * aviso da noite; na madrugada, a noite de ontem) ou null. Uma vez por fluxo e dia: o `GuidedRun` criado ao abrir impede repetir.
 */
export async function autoOpenHref(userId: string, i: { tz: string; wellbeing: boolean; now?: Date }): Promise<string | null> {
  const now = i.now ?? new Date();
  const today = todayInTz(i.tz, now) as DateISO;
  const yesterday = addDays(today, -1);
  const [entry, yEntry, prefs, runs, journey] = await Promise.all([
    db.dailyEntry.findUnique({ where: { userId_date: { userId, date: toDbDate(today) } }, select: PROGRESS_SELECT }),
    db.dailyEntry.findUnique({ where: { userId_date: { userId, date: toDbDate(yesterday) } }, select: PROGRESS_SELECT }),
    db.notificationPrefs.findUnique({ where: { userId }, select: { morningTime: true, nightTime: true } }),
    db.guidedRun.findMany({ where: { userId, periodKey: { in: [today, yesterday] }, flow: { in: ['DAY_MORNING', 'DAY_NIGHT'] } }, select: { flow: true, periodKey: true } }),
    getJourney(userId),
  ]);
  const opts = { wellbeing: i.wellbeing, available: journey.sections };
  const target = autoOpenTarget({
    localTime: formatTimeInTz(now.toISOString(), i.tz),
    morningTime: prefs?.morningTime ?? DEFAULT_TIMES.morningTime,
    nightTime: prefs?.nightTime ?? DEFAULT_TIMES.nightTime,
    progress: computeDayProgress(today, entry, opts),
    startedToday: runs.filter((r) => r.periodKey === today).map((r) => r.flow),
    // A noite de ontem só na madrugada (a janela do Glow do dia de ontem ainda está aberta).
    yesterday: { progress: computeDayProgress(yesterday, yEntry, opts), started: runs.filter((r) => r.periodKey === yesterday).map((r) => r.flow) },
  });
  if (!target) return null;
  const date = target.day === 'yesterday' ? yesterday : today;
  return `/guided/day/${date}/${target.flow === 'DAY_MORNING' ? 'morning' : 'night'}`;
}
