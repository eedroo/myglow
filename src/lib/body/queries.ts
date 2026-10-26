import 'server-only';
import { db } from '@/lib/db';
import { getEntitlements } from '@/lib/entitlements/server';
import { addDays, fromDbDate, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { weekDays, weekStartOf } from '@/lib/weeks';
import type { AppLocale } from '@/i18n/locales';
import { EXERCISE_VIEW, toExerciseView } from '@/lib/fitness/queries';
import { bestsOf, compareWithPrevious, dayStats, e1rm, summarize, type Comparison, type DayStats, type SessionExerciseSummary } from '@/lib/fitness/progress';
import type { ExerciseView } from '@/lib/fitness/types';
import { goalStatus, weekAverage, type GoalStatus, type WeightPoint } from './weight';
import { lastTrainedByMuscle, MAP_MUSCLES, muscleRecovery, toMapMuscles, type MapMuscle, type Recovery } from './muscles';

/** Corpo II (F17): leituras do peso, do dia, do mapa muscular e da evolução por exercício. Só servidor. */

async function userTz(userId: string): Promise<string> {
  return (await db.user.findUnique({ where: { id: userId }, select: { timezone: true } }))?.timezone ?? 'UTC';
}

// ─── Peso ─────────────────────────────────────────────────────────────────────────────────────────

export interface WeightPageData {
  today: DateISO;
  points: WeightPoint[]; // últimos 400 dias, por data
  last: WeightPoint | null;
  thisWeekAvg: number | null;
  lastWeekAvg: number | null;
  thisWeekCount: number;
  goal: { direction: 'GAIN' | 'MAINTAIN' | 'LOSE'; weeklyRateGrams: number; targetGrams: number | null; startGrams: number; startedAt: string } | null;
  status: GoalStatus | null;
  reminder: { enabled: boolean; time: string };
}

export async function getWeightData(userId: string): Promise<WeightPageData> {
  const tz = await userTz(userId);
  const today = todayInTz(tz);
  const [rows, goal, prefs] = await Promise.all([
    db.bodyWeightEntry.findMany({ where: { userId, date: { gte: toDbDate(addDays(today, -400)) } }, orderBy: { date: 'asc' }, select: { date: true, grams: true } }),
    db.bodyGoal.findUnique({ where: { userId } }),
    db.fitnessPrefs.findUnique({ where: { userId }, select: { weighInReminder: true, weighInTime: true } }),
  ]);
  const points = rows.map((r) => ({ date: fromDbDate(r.date), grams: r.grams }));
  const week = weekStartOf(today);
  const thisWeekAvg = weekAverage(points, week);
  const lastWeekAvg = weekAverage(points, addDays(week, -7));
  const g = goal && { direction: goal.direction, weeklyRateGrams: goal.weeklyRateGrams, targetGrams: goal.targetGrams, startGrams: goal.startGrams, startedAt: goal.startedAt.toISOString() };
  return {
    today,
    points,
    last: points[points.length - 1] ?? null,
    thisWeekAvg,
    lastWeekAvg,
    thisWeekCount: points.filter((p) => p.date >= week).length,
    goal: g,
    status: g ? goalStatus(g, thisWeekAvg, lastWeekAvg) : null,
    reminder: { enabled: prefs?.weighInReminder ?? false, time: prefs?.weighInTime ?? '08:00' },
  };
}

/** Médias semanais do peso diário (Semana, estatísticas e retrospectiva). Vazio = sem registos diários no intervalo. */
export async function weeklyWeightAverages(userId: string, weekStarts: DateISO[]): Promise<Map<DateISO, { avgGrams: number; count: number }>> {
  const out = new Map<DateISO, { avgGrams: number; count: number }>();
  if (!weekStarts.length) return out;
  const sorted = [...weekStarts].sort();
  const rows = await db.bodyWeightEntry.findMany({
    where: { userId, date: { gte: toDbDate(sorted[0]!), lte: toDbDate(addDays(sorted[sorted.length - 1]!, 6)) } },
    select: { date: true, grams: true },
  });
  const points = rows.map((r) => ({ date: fromDbDate(r.date), grams: r.grams }));
  for (const w of weekStarts) {
    const avg = weekAverage(points, w);
    if (avg != null) out.set(w, { avgGrams: avg, count: points.filter((p) => p.date >= w && p.date <= addDays(w, 6)).length });
  }
  return out;
}

/**
 * Semanas com registos diários entre `from` e `to` (domingos), como peso semanal: só para body-pro com consentimento
 * de bem-estar; senão vazio (fica o peso manual).
 */
export async function dailyWeightWeeks(userId: string, from: DateISO, to: DateISO): Promise<{ startDate: DateISO; weightGrams: number }[]> {
  const [ent, user] = await Promise.all([getEntitlements(userId), db.user.findUnique({ where: { id: userId }, select: { wellbeingConsentAt: true } })]);
  if (!ent.features['body-pro'] || !user?.wellbeingConsentAt) return [];
  const starts: DateISO[] = [];
  for (let w = weekStartOf(from); w <= to; w = addDays(w, 7)) if (w >= from) starts.push(w);
  const avgs = await weeklyWeightAverages(userId, starts);
  return [...avgs.entries()].map(([startDate, a]) => ({ startDate, weightGrams: a.avgGrams }));
}

// ─── Dia ──────────────────────────────────────────────────────────────────────────────────────────

export interface DaySetDetail {
  exercise: ExerciseView;
  groups: { weightGrams: number | null; reps: (number | null)[]; durations: (number | null)[]; prs: number }[];
}

export interface DayPageData {
  date: DateISO;
  today: DateISO;
  week: { date: DateISO; trained: boolean }[];
  stats: DayStats | null;
  details: DaySetDetail[];
  sessions: { id: string; name: string | null; startedAt: string; durationSec: number | null; sets: number }[];
}

export async function getDayData(userId: string, date: DateISO, locale: AppLocale): Promise<DayPageData> {
  const tz = await userTz(userId);
  const days = weekDays(weekStartOf(date));
  const [sessions, weekSessions] = await Promise.all([
    db.fitnessSession.findMany({
      where: { userId, date: toDbDate(date), sets: { some: {} } },
      orderBy: { startedAt: 'asc' },
      include: { workout: { select: { name: true } }, sets: { orderBy: { completedAt: 'asc' }, include: { exercise: { select: EXERCISE_VIEW } } } },
    }),
    db.fitnessSession.findMany({
      where: { userId, date: { gte: toDbDate(days[0]!), lte: toDbDate(days[6]!) }, sets: { some: {} } },
      select: { date: true },
    }),
  ]);
  const trained = new Set(weekSessions.map((s) => fromDbDate(s.date)));
  const details = new Map<string, DaySetDetail>();
  for (const s of sessions) {
    for (const x of s.sets) {
      const d = details.get(x.exerciseId) ?? { exercise: toExerciseView(x.exercise, locale), groups: [] };
      const last = d.groups[d.groups.length - 1];
      const g = last && last.weightGrams === x.weightGrams ? last : (d.groups.push({ weightGrams: x.weightGrams, reps: [], durations: [], prs: 0 }), d.groups[d.groups.length - 1]!);
      g.reps.push(x.reps);
      g.durations.push(x.durationSec);
      if (x.prKinds.length) g.prs++;
      details.set(x.exerciseId, d);
    }
  }
  return {
    date,
    today: todayInTz(tz),
    week: days.map((d) => ({ date: d, trained: trained.has(d) })),
    stats: sessions.length
      ? dayStats(sessions.map((s) => ({ startedAt: s.startedAt, endedAt: s.endedAt, sets: s.sets.map((x) => ({ exerciseId: x.exerciseId, reps: x.reps ?? undefined, weightGrams: x.weightGrams ?? undefined, durationSec: x.durationSec ?? undefined, completedAt: x.completedAt, prKinds: x.prKinds })) })))
      : null,
    details: [...details.values()],
    sessions: sessions.map((s) => ({
      id: s.id,
      name: s.workout?.name ?? null,
      startedAt: s.startedAt.toISOString(),
      durationSec: s.endedAt ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 1000) : null,
      sets: s.sets.length,
    })),
  };
}

/** Dias com treino (calendário), mais recentes primeiro, até 2 anos. */
export async function trainedDates(userId: string): Promise<DateISO[]> {
  const rows = await db.fitnessSession.findMany({
    where: { userId, sets: { some: {} }, startedAt: { gte: new Date(Date.now() - 730 * 86_400_000) } },
    select: { date: true },
    distinct: ['date'],
    orderBy: { date: 'desc' },
  });
  return rows.map((r) => fromDbDate(r.date));
}

// ─── Corpo: mapa muscular ─────────────────────────────────────────────────────────────────────────

export interface MuscleData {
  recovery: Record<MapMuscle, Recovery>;
  /** Por músculo: últimos exercícios que o trabalharam (até 6), com a data. */
  recent: Partial<Record<MapMuscle, { id: string; name: string; date: DateISO }[]>>;
  unassigned: { id: string; name: string }[];
}

export async function getMuscleData(userId: string, locale: AppLocale): Promise<MuscleData> {
  const since = new Date(Date.now() - 60 * 86_400_000);
  const [sets, customs] = await Promise.all([
    db.sessionSet.findMany({
      where: { userId, completedAt: { gte: since } },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true, session: { select: { date: true } }, exercise: { select: EXERCISE_VIEW } },
    }),
    db.exercise.findMany({ where: { ownerId: userId, archivedAt: null, primaryMuscles: { isEmpty: true } }, select: EXERCISE_VIEW }),
  ]);
  const last = lastTrainedByMuscle(sets.map((s) => ({ completedAt: s.completedAt, primary: s.exercise.primaryMuscles, secondary: s.exercise.secondaryMuscles })));
  const recent: MuscleData['recent'] = {};
  for (const s of sets) {
    for (const m of toMapMuscles(s.exercise.primaryMuscles)) {
      const list = (recent[m] ??= []);
      if (list.length < 6 && !list.some((x) => x.id === s.exercise.id)) {
        list.push({ id: s.exercise.id, name: toExerciseView(s.exercise, locale).name, date: fromDbDate(s.session.date) });
      }
    }
  }
  return {
    recovery: muscleRecovery(last.primary, new Date(), last.secondary),
    recent,
    unassigned: customs.map((e) => ({ id: e.id, name: toExerciseView(e, locale).name })),
  };
}

export { MAP_MUSCLES };

// ─── Evolução por exercício ───────────────────────────────────────────────────────────────────────

export interface ExerciseProgress {
  sessions: { date: DateISO; summary: SessionExerciseSummary; bestWeightGrams: number | null }[]; // por ordem
  comparison: Record<keyof SessionExerciseSummary, Comparison | null> | null; // sessão mais recente vs anterior
  records: {
    weight: { grams: number; date: DateISO } | null;
    e1rm: { grams: number; date: DateISO } | null;
    repsAtWeight: { weightGrams: number; reps: number; date: DateISO }[];
  };
}

export async function getExerciseProgress(userId: string, exerciseId: string): Promise<ExerciseProgress> {
  const sets = await db.sessionSet.findMany({
    where: { userId, exerciseId },
    orderBy: { completedAt: 'asc' },
    select: { sessionId: true, reps: true, weightGrams: true, completedAt: true, session: { select: { date: true } } },
  });
  const bySession = new Map<string, { date: DateISO; sets: { reps?: number; weightGrams?: number }[] }>();
  const records: ExerciseProgress['records'] = { weight: null, e1rm: null, repsAtWeight: [] };
  const repsAt = new Map<number, { reps: number; date: DateISO }>();
  for (const s of sets) {
    const date = fromDbDate(s.session.date);
    const v = { reps: s.reps ?? undefined, weightGrams: s.weightGrams ?? undefined };
    const g = bySession.get(s.sessionId) ?? { date, sets: [] };
    g.sets.push(v);
    bySession.set(s.sessionId, g);
    if (s.weightGrams != null && (!records.weight || s.weightGrams > records.weight.grams)) records.weight = { grams: s.weightGrams, date };
    const e = s.weightGrams != null && s.reps != null ? e1rm(s.weightGrams, s.reps) : null;
    if (e != null && (!records.e1rm || e > records.e1rm.grams)) records.e1rm = { grams: e, date };
    if (s.reps != null) {
      const w = s.weightGrams ?? 0;
      const cur = repsAt.get(w);
      if (!cur || s.reps > cur.reps) repsAt.set(w, { reps: s.reps, date });
    }
  }
  records.repsAtWeight = [...repsAt.entries()].sort((a, b) => b[0] - a[0]).slice(0, 12).map(([weightGrams, r]) => ({ weightGrams, ...r }));
  const sessions = [...bySession.values()].map((g) => ({ date: g.date, summary: summarize(g.sets), bestWeightGrams: bestsOf(g.sets).weightGrams }));
  const n = sessions.length;
  return {
    sessions,
    comparison: n >= 2 ? compareWithPrevious(sessions[n - 1]!.summary, sessions[n - 2]!.summary) : null,
    records,
  };
}
