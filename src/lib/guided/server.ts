import 'server-only';
import { db } from '@/lib/db';
import { getEntitlements } from '@/lib/entitlements/server';
import { todayInTz, type DateISO } from '@/lib/dates';
import { addDays, formatTimeInTz } from '@/lib/dates';
import { computeDayProgress, type ProgressEntry } from '@/lib/daily/progress';
import { isWindowOpen, xpWindow } from '@/lib/xp/rules';
import { tourStateFromDb } from '@/lib/tour/machine';
import type { DailyEntryData } from '@/types/daily';
import type { GuidedFlow } from '@prisma/client';
import type { SectionContext } from './sections';
import { suggestDayFlow } from './suggest';
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
): Promise<{ base: string | null; suggested: GuidedFlow | null }> {
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
  return { base, suggested: suggestDayFlow({ localTime: formatTimeInTz(now.toISOString(), i.tz), prefs: prefs ?? DEFAULT_TIMES, progress }) };
}
