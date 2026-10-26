import 'server-only';
import { getLocale, getTranslations } from 'next-intl/server';
import type { RecapKind } from '@prisma/client';
import { db } from '@/lib/db';
import { addDays, compareDates, dayBoundsUtc, formatMonthName, fromDbDate, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { parseMonthKey, weekKey } from '@/lib/weeks';
import { computeDayProgress, PROGRESS_SELECT } from '@/lib/daily/progress';
import { computePeriodStats, mergeDailyWeights, weightFromPoints, type DailyEntryLike, type PeriodStats } from '@/lib/stats/period';
import { dailyWeightWeeks } from '@/lib/body/queries';
import { hasWellbeingConsent } from '@/lib/account/consent';
import { getMoonEvents } from '@/lib/astro/moonCalendar';
import { getCachedRetrogradePeriods, getCachedSkyEvents } from '@/lib/astro/skyCache';
import { getEntitlements } from '@/lib/entitlements/server';
import { getGuideEntryStatus } from '@/lib/guide/queries';
import { publishedCourses } from '@/lib/grimoire/queries';
import { dbToAppLocale, isAppLocale } from '@/i18n/locales';
import type { RecapCourse, RecapInput } from './build';
import { isRecapAvailable, isWorthShowing, previousMonthPeriod, previousWeekPeriod, type RecapKindKey, type RecapPeriod } from './period';

/** Retrospectiva (F13): recolha de dados. Só lê, excepto `markRecapSeen`/`markRecapCompleted`. */

const filled = (s: string | null | undefined) => typeof s === 'string' && s.trim() !== '';

async function loadEntries(userId: string, from: DateISO, to: DateISO): Promise<DailyEntryLike[]> {
  const rows = await db.dailyEntry.findMany({
    where: { userId, date: { gte: toDbDate(from), lte: toDbDate(to) } },
    select: { date: true, ...PROGRESS_SELECT },
  });
  return rows.map((e) => ({ ...e, date: fromDbDate(e.date) }));
}

async function sumXp(userId: string, where: { gte?: DateISO; lte?: DateISO; lt?: DateISO }): Promise<number> {
  const r = await db.xpEvent.aggregate({
    where: {
      userId,
      periodStart: {
        ...(where.gte ? { gte: toDbDate(where.gte) } : {}),
        ...(where.lte ? { lte: toDbDate(where.lte) } : {}),
        ...(where.lt ? { lt: toDbDate(where.lt) } : {}),
      },
    },
    _sum: { points: true },
  });
  return r._sum.points ?? 0;
}

/** Dias com algum registo no período (o mesmo critério dos níveis do dia). */
export async function recapDaysTouched(userId: string, period: RecapPeriod, wellbeing: boolean): Promise<number> {
  const entries = await loadEntries(userId, period.from, period.to);
  return entries.filter((e) => computeDayProgress(e.date, e, { wellbeing }).level !== 'empty').length;
}

/** Período acabado, posterior à criação da conta e com dias suficientes: pode mostrar-se o cartão. */
export async function isRecapShowable(
  user: { id: string; timezone: string; createdAt: Date },
  period: RecapPeriod,
): Promise<boolean> {
  const today = todayInTz(user.timezone);
  if (!isRecapAvailable(period, today, todayInTz(user.timezone, user.createdAt))) return false;
  const wellbeing = await hasWellbeingConsent(user.id);
  return isWorthShowing(await recapDaysTouched(user.id, period, wellbeing));
}

export async function hasSeenRecap(userId: string, period: RecapPeriod): Promise<boolean> {
  const row = await db.recapView.findUnique({
    where: { userId_kind_periodKey: { userId, kind: period.kind, periodKey: period.key } },
    select: { userId: true },
  });
  return row !== null;
}

export async function getRecapInput(userId: string, period: RecapPeriod): Promise<RecapInput> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true, hemisphere: true, locale: true },
  });
  const tz = user.timezone;
  const rawLocale = await getLocale();
  const locale = isAppLocale(rawLocale) ? rawLocale : dbToAppLocale(user.locale);
  const isWeek = period.kind === 'WEEK';
  const fromDb = toDbDate(period.from);
  const toDb = toDbDate(period.to);
  const start = dayBoundsUtc(period.from, tz).start;
  const end = dayBoundsUtc(period.to, tz).end;

  const [wellbeing, entitlements, entries, prevEntries, weights, plan, earned, prevEarned, totalBefore, lessons, courses, t] =
    await Promise.all([
      hasWellbeingConsent(userId),
      getEntitlements(userId),
      loadEntries(userId, period.from, period.to),
      loadEntries(userId, period.prev.from, period.prev.to),
      db.week.findMany({
        where: { userId, startDate: { gte: fromDb, lte: toDb }, weightGrams: { not: null } },
        select: { startDate: true, weightGrams: true },
      }),
      isWeek
        ? db.week.findUnique({
            where: { userId_startDate: { userId, startDate: fromDb } },
            select: { title: true, intention: true, reflection: true },
          })
        : db.month.findUnique({
            where: { userId_year_month: { userId, ...parseMonthKey(period.key) } },
            select: { intention: true, reflection: true },
          }),
      sumXp(userId, { gte: period.from, lte: period.to }),
      sumXp(userId, { gte: period.prev.from, lte: period.prev.to }),
      sumXp(userId, { lt: period.from }),
      db.lessonProgress.count({ where: { userId, completedAt: { gte: start, lt: end } } }),
      db.courseProgress.findMany({ where: { userId, completedAt: { gte: start, lt: end } }, select: { courseSlug: true } }),
      getTranslations('week'),
    ]);

  const today = period.to; // o período já acabou: conta-se até ao último dia
  // F17 (body-pro): médias do peso diário. Semanal: esta semana e a anterior; mensal: as semanas do mês.
  const daily = await dailyWeightWeeks(userId, isWeek ? addDays(period.from, -7) : period.from, period.to);
  const weeks = mergeDailyWeights(weights.map((w) => ({ startDate: fromDbDate(w.startDate), weightGrams: w.weightGrams })), daily);
  let stats: PeriodStats = computePeriodStats({ from: period.from, to: period.to, today, entries, weeks, wellbeing });
  if (isWeek && wellbeing && daily.length) stats = { ...stats, weight: weightFromPoints(daily.map((d) => ({ weekStart: d.startDate, grams: d.weightGrams }))) };
  const prevStats = computePeriodStats({ from: period.prev.from, to: period.prev.to, today: period.prev.to, entries: prevEntries, weeks: [], wellbeing });

  const byDate = new Map(entries.map((e) => [e.date, e]));
  const dayLevels: RecapInput['dayLevels'] = [];
  for (let date = period.from; compareDates(date, period.to) <= 0; date = addDays(date, 1)) {
    dayLevels.push({ date, level: computeDayProgress(date, byDate.get(date) ?? null, { wellbeing }).level });
  }
  const dayIntentions: Record<DateISO, string> = {};
  for (const e of entries) if (filled(e.intention)) dayIntentions[e.date] = e.intention!.trim();

  const catalog = new Map(publishedCourses({ userLocale: locale, readInPortuguese: true }).map((c) => [c.entry.slug, c.course]));
  const coursesCompleted: RecapCourse[] = courses.flatMap((c) => {
    const course = catalog.get(c.courseSlug);
    return course ? [{ slug: c.courseSlug, title: course.title, icon: course.badge.icon }] : [];
  });

  let periodTitle: string;
  if (isWeek) {
    const k = weekKey(period.key);
    const custom = plan && 'title' in plan ? (plan.title as string | null) : null;
    periodTitle = custom && filled(custom) ? custom.trim() : t('defaultTitle', { n: k.weekOfMonth, month: formatMonthName(k.year, k.month, locale) });
  } else {
    const { year, month } = parseMonthKey(period.key);
    periodTitle = formatMonthName(year, month, locale);
  }

  // F14: estado do Guia para o último slide.
  const guideAccess: RecapInput['guideAccess'] = !entitlements.features.guide
    ? 'locked'
    : await getGuideEntryStatus(userId, period.kind, period.key).then((s) => (s === 'consent' ? 'consent' : s === 'ready' ? 'ready' : 'pending'));

  const [skyEvents, retrogrades] = isWeek
    ? [[], []]
    : await Promise.all([
        getCachedSkyEvents(period.from, period.to, tz, user.hemisphere),
        getCachedRetrogradePeriods(period.from, period.to, tz),
      ]);

  return {
    period,
    today,
    now: new Date(),
    tz,
    locale,
    hasWellbeingConsent: wellbeing,
    guideAccess,
    periodTitle,
    intention: filled(plan?.intention) ? plan!.intention!.trim() : null,
    reflectionEmpty: !filled(plan?.reflection),
    stats,
    prevStats,
    dayLevels,
    dayIntentions,
    glow: { earned, prevEarned, totalBefore, totalAfter: totalBefore + earned },
    grimoire: { lessons, coursesCompleted },
    moonEvents: getMoonEvents(period.from, period.to, tz),
    skyEvents,
    retrogrades,
  };
}

const viewKey = (userId: string, period: RecapPeriod) => ({
  userId_kind_periodKey: { userId, kind: period.kind as RecapKind, periodKey: period.key },
});

/** Primeira vista: cria a linha; vistas seguintes não mexem em `firstSeenAt`. */
export async function markRecapSeen(userId: string, period: RecapPeriod): Promise<void> {
  await db.recapView.upsert({
    where: viewKey(userId, period),
    create: { userId, kind: period.kind, periodKey: period.key },
    update: {},
  });
}

/** Chegou ao último slide (a primeira vez conta). */
export async function markRecapCompleted(userId: string, period: RecapPeriod): Promise<void> {
  await db.recapView.upsert({
    where: viewKey(userId, period),
    create: { userId, kind: period.kind, periodKey: period.key, completedAt: new Date() },
    update: {},
  });
  await db.recapView.updateMany({
    where: { userId, kind: period.kind, periodKey: period.key, completedAt: null },
    data: { completedAt: new Date() },
  });
}

/** Retrospectivas vistas nos últimos 40 dias (para `dueRecap`). */
export async function recentRecapViews(userId: string): Promise<{ kind: RecapKindKey; key: string }[]> {
  const rows = await db.recapView.findMany({
    where: { userId, firstSeenAt: { gte: new Date(Date.now() - 40 * 86_400_000) } },
    select: { kind: true, periodKey: true },
  });
  return rows.map((r) => ({ kind: r.kind, key: r.periodKey }));
}

/**
 * Rota da retrospectiva: período acabado e que não terminou antes do mês de criação da conta.
 */
export async function recapRouteAllowed(userId: string, period: RecapPeriod): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true, createdAt: true } });
  if (!user) return false;
  const today = todayInTz(user.timezone);
  const createdMonthStart = `${todayInTz(user.timezone, user.createdAt).slice(0, 7)}-01`;
  return compareDates(period.to, today) < 0 && compareDates(period.to, createdMonthStart) >= 0;
}

/** A pessoa já pediu para ser avisada do premium (o cadeado do Guia mostra "Combinado"). */
export async function recapGuideInterested(userId: string): Promise<boolean> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { premiumInterestAt: true } });
  return !!u?.premiumInterestAt;
}

/** F13: URL das retrospectivas elegíveis e por ver, para os avisos de início de semana e de mês. */
export async function readyRecapUrls(userId: string, today: DateISO, kinds: { week: boolean; month: boolean }): Promise<{ week?: string; month?: string }> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, timezone: true, createdAt: true } });
  if (!user) return {};
  const out: { week?: string; month?: string } = {};
  const check = async (period: RecapPeriod) =>
    (await isRecapShowable(user, period)) && !(await hasSeenRecap(userId, period))
      ? `/recap/${period.kind === 'WEEK' ? 'week' : 'month'}/${period.key}?auto=1`
      : undefined;
  if (kinds.week) out.week = await check(previousWeekPeriod(today));
  if (kinds.month) out.month = await check(previousMonthPeriod(today));
  return out;
}
