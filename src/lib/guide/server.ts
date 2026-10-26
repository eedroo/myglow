import 'server-only';
import { db } from '@/lib/db';
import { dayBoundsUtc, fromDbDate, toDbDate } from '@/lib/dates';
import { parseMonthKey, weeksOfMonth } from '@/lib/weeks';
import { PROGRESS_SELECT } from '@/lib/daily/progress';
import { computePeriodStats } from '@/lib/stats/period';
import { getMoonEvents } from '@/lib/astro/moonCalendar';
import { dbToAppLocale } from '@/i18n/locales';
import type { RecapPeriod } from '@/lib/recap/period';
import type { RawGuideData, RawPeriodText } from './input';
import { guideReportSchema } from './schema';
import { getEntitlements } from '@/lib/entitlements/server';
import { addDays } from '@/lib/dates';
import { exerciseName, type ExerciseNames } from '@/lib/fitness/library';

/**
 * Recolha dos dados do Guia (F14). Lê só os campos de que precisa; o filtro final do que segue para a IA
 * é `buildGuideInput` (input.ts). Nunca lê nome, email, peso nem o perfil de nascimento.
 */
export interface GuideData {
  raw: RawGuideData;
  hasWellbeingConsent: boolean;
  /** F17: body-pro + `guideIncludeBody` + consentimento de bem-estar. */
  includeBody: boolean;
}

const prevKey = (p: RecapPeriod) => (p.kind === 'WEEK' ? p.prev.from : p.prev.from.slice(0, 7));

export async function loadGuideData(userId: string, period: RecapPeriod): Promise<GuideData | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true, timezone: true, wellbeingConsentAt: true, guideIncludeBody: true } });
  if (!user) return null;
  const tz = user.timezone;
  const wellbeing = !!user.wellbeingConsentAt;
  const fromDb = toDbDate(period.from);
  const toDb = toDbDate(period.to);
  const isWeek = period.kind === 'WEEK';
  const weekStarts = isWeek ? [period.from] : weeksOfMonth(parseMonthKey(period.key).year, parseMonthKey(period.key).month);

  const [entries, weeks, projects, month, xp, lessons, previous] = await Promise.all([
    db.dailyEntry.findMany({ where: { userId, date: { gte: fromDb, lte: toDb } }, select: { date: true, ...PROGRESS_SELECT } }),
    db.week.findMany({
      where: { userId, startDate: { in: weekStarts.map(toDbDate) } },
      select: { startDate: true, intention: true, reflection: true, dayNotes: { select: { date: true, text: true } } },
    }),
    db.projectIntention.findMany({
      where: {
        userId,
        OR: [
          { period: 'WEEK', periodStart: { in: weekStarts.map(toDbDate) } },
          ...(isWeek ? [] : [{ period: 'MONTH' as const, periodStart: fromDb }]),
        ],
      },
      select: { period: true, periodStart: true, area: true, text: true },
    }),
    isWeek
      ? Promise.resolve(null)
      : db.month.findUnique({ where: { userId_year_month: { userId, ...parseMonthKey(period.key) } }, select: { intention: true, reflection: true } }),
    db.xpEvent.aggregate({ where: { userId, periodStart: { gte: fromDb, lte: toDb } }, _sum: { points: true } }),
    db.lessonProgress.count({
      where: { userId, completedAt: { gte: dayBoundsUtc(period.from, tz).start, lt: dayBoundsUtc(period.to, tz).end } },
    }),
    db.guideReport.findUnique({
      where: { userId_kind_periodKey: { userId, kind: period.kind, periodKey: prevKey(period) } },
      select: { status: true, payload: true },
    }),
  ]);

  const list = entries.map((e) => ({ ...e, date: fromDbDate(e.date) }));
  const weekRows = new Map(weeks.map((w) => [fromDbDate(w.startDate), w]));
  const projectsFor = (kind: 'WEEK' | 'MONTH', start: string) =>
    projects.filter((p) => p.period === kind && fromDbDate(p.periodStart) === start).map((p) => ({ area: p.area, text: p.text }));
  const weekText = (start: string): RawPeriodText => {
    const w = weekRows.get(start);
    return { intention: w?.intention ?? null, reflection: w?.reflection ?? null, projects: projectsFor('WEEK', start) };
  };

  const dayNotes: Record<string, string> = {};
  for (const w of weeks) for (const n of w.dayNotes) dayNotes[fromDbDate(n.date)] = n.text;

  const prevPayload = previous?.status === 'READY' ? guideReportSchema.safeParse(previous.payload) : null;

  const raw: RawGuideData = {
    kind: period.kind,
    locale: dbToAppLocale(user.locale),
    from: period.from,
    to: period.to,
    period: isWeek
      ? weekText(period.from)
      : { intention: month?.intention ?? null, reflection: month?.reflection ?? null, projects: projectsFor('MONTH', period.from) },
    ...(isWeek ? {} : { weeks: weekStarts.map((start) => ({ start, ...weekText(start) })) }),
    entries: list,
    dayNotes,
    // O período já acabou: conta-se até ao último dia. Peso nunca entra (weeks: []).
    stats: computePeriodStats({ from: period.from, to: period.to, today: period.to, entries: list, weeks: [], wellbeing }),
    glowEarned: xp._sum.points ?? 0,
    lessons,
    moonEvents: getMoonEvents(period.from, period.to, tz),
    ...(prevPayload?.success ? { previousFocuses: prevPayload.data.focuses.map((f) => f.title) } : {}),
  };
  // F17: o corpo só com autorização própria (e acesso e consentimento de bem-estar).
  const includeBody = !!user.guideIncludeBody && wellbeing && (await getEntitlements(userId)).features['body-pro'];
  if (includeBody) raw.body = await loadGuideBody(userId, period.from, period.to, dbToAppLocale(user.locale));
  return { raw, hasWellbeingConsent: wellbeing, includeBody };
}

async function loadGuideBody(userId: string, from: string, to: string, locale: ReturnType<typeof dbToAppLocale>): Promise<NonNullable<RawGuideData['body']>> {
  const [weights, goal, sessions] = await Promise.all([
    db.bodyWeightEntry.findMany({ where: { userId, date: { gte: toDbDate(addDays(from, -7)), lte: toDbDate(to) } }, select: { date: true, grams: true } }),
    db.bodyGoal.findUnique({ where: { userId }, select: { direction: true, weeklyRateGrams: true, targetGrams: true } }),
    db.fitnessSession.findMany({
      where: { userId, date: { gte: toDbDate(from), lte: toDbDate(to) }, sets: { some: {} } },
      select: { date: true, sets: { select: { reps: true, weightGrams: true, prKinds: true, exercise: { select: { names: true } } } } },
    }),
  ]);
  return {
    weights: weights.map((w) => ({ date: fromDbDate(w.date), grams: w.grams })),
    goal,
    sessions: sessions.map((s) => ({
      date: fromDbDate(s.date),
      sets: s.sets.map((x) => ({ exerciseName: exerciseName(x.exercise.names as ExerciseNames, locale), reps: x.reps, weightGrams: x.weightGrams, prKinds: x.prKinds })),
    })),
  };
}
