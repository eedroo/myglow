import 'server-only';
import type { Exercise, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { fromDbDate, type DateISO } from '@/lib/dates';
import type { AppLocale } from '@/i18n/locales';
import { exerciseInstructions, exerciseName, type ExerciseNames } from './library';
import { autoEndAt, restFor } from './session';
import { recomputePrs } from './progress';
import type { ActiveSessionView, ExerciseHistoryGroup, ExerciseView, LastPerformance, SessionSetView } from './types';

/** Leituras do Foco no corpo (F16). Só lêem (excepto fechar uma sessão esquecida há mais de 6 h). */

export const DEFAULT_PREFS = { defaultRestSec: 90, restAlert: true, keepAwake: true, onboardedAt: null as Date | null };

export async function getFitnessPrefs(userId: string) {
  return (await db.fitnessPrefs.findUnique({ where: { userId } })) ?? { userId, ...DEFAULT_PREFS };
}

export const EXERCISE_VIEW = {
  id: true, source: true, names: true, category: true, measure: true, primaryMuscles: true, secondaryMuscles: true,
  equipment: true, images: true,
} as const satisfies Prisma.ExerciseSelect;

type ExerciseViewRow = Prisma.ExerciseGetPayload<{ select: typeof EXERCISE_VIEW }>;

export function toExerciseView(e: ExerciseViewRow, locale: AppLocale): ExerciseView {
  const names = e.names as ExerciseNames;
  return {
    id: e.id,
    source: e.source,
    name: exerciseName(names, locale),
    nameEn: names.en ?? exerciseName(names, locale),
    category: e.category,
    measure: e.measure,
    primaryMuscles: e.primaryMuscles,
    secondaryMuscles: e.secondaryMuscles,
    equipment: e.equipment,
    thumb: e.images[0] ?? null,
  };
}

/** Exercícios que a pessoa pode usar: a biblioteca e os seus (sem os arquivados). */
const visibleTo = (userId: string): Prisma.ExerciseWhereInput => ({
  archivedAt: null,
  OR: [{ source: 'LIBRARY' }, { ownerId: userId }],
});

export async function listExercises(userId: string, locale: AppLocale): Promise<ExerciseView[]> {
  const rows = await db.exercise.findMany({ where: visibleTo(userId), select: EXERCISE_VIEW });
  return rows.map((r) => toExerciseView(r, locale)).sort((a, b) => a.name.localeCompare(b.name, locale));
}

export async function countCustomExercises(userId: string): Promise<number> {
  return db.exercise.count({ where: { ownerId: userId, archivedAt: null } });
}

/** O exercício existe e a pessoa pode usá-lo. */
export async function usableExercise(userId: string, id: string): Promise<Exercise | null> {
  return db.exercise.findFirst({ where: { id, ...visibleTo(userId) } });
}

// ─── Programas e treinos ──────────────────────────────────────────────────────────────────────────

export async function listPrograms(userId: string) {
  const rows = await db.fitnessProgram.findMany({
    where: { userId, archivedAt: null },
    orderBy: { order: 'asc' },
    select: { id: true, name: true, description: true, kind: true, _count: { select: { workouts: { where: { archivedAt: null } } } } },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, description: r.description, kind: r.kind, workouts: r._count.workouts }));
}

export async function getProgram(userId: string, id: string) {
  const p = await db.fitnessProgram.findFirst({
    where: { id, userId, archivedAt: null },
    select: {
      id: true, name: true, description: true, kind: true,
      workouts: {
        where: { archivedAt: null },
        orderBy: { order: 'asc' },
        select: { id: true, name: true, notes: true, _count: { select: { items: true } } },
      },
    },
  });
  if (!p) return null;
  return { ...p, workouts: p.workouts.map((w) => ({ id: w.id, name: w.name, notes: w.notes, items: w._count.items })) };
}

/** Último dia em que cada exercício foi feito (para "última vez há 3 sem."). */
async function lastDoneDates(userId: string, exerciseIds: string[]): Promise<Map<string, Date>> {
  if (!exerciseIds.length) return new Map();
  const rows = await db.sessionSet.groupBy({
    by: ['exerciseId'],
    where: { userId, exerciseId: { in: exerciseIds } },
    _max: { completedAt: true },
  });
  return new Map(rows.filter((r) => r._max.completedAt).map((r) => [r.exerciseId, r._max.completedAt!]));
}

export async function getWorkout(userId: string, id: string, locale: AppLocale) {
  const [w, prefs] = await Promise.all([
    db.fitnessWorkout.findFirst({
      where: { id, userId, archivedAt: null, program: { archivedAt: null } },
      select: {
        id: true, name: true, notes: true, programId: true, program: { select: { name: true, kind: true } },
        items: { orderBy: { order: 'asc' }, include: { exercise: { select: { ...EXERCISE_VIEW, defaultRestSec: true } } } },
      },
    }),
    getFitnessPrefs(userId),
  ]);
  if (!w) return null;
  const last = await lastDoneDates(userId, w.items.map((i) => i.exerciseId));
  return {
    id: w.id,
    name: w.name,
    notes: w.notes,
    programId: w.programId,
    programName: w.program.name,
    items: w.items.map((i) => ({
      id: i.id,
      exercise: toExerciseView(i.exercise, locale),
      targetSets: i.targetSets,
      targetRepsMin: i.targetRepsMin,
      targetRepsMax: i.targetRepsMax,
      targetSec: i.targetSec,
      restSec: restFor(i, i.exercise, prefs),
      customRest: i.restSec,
      notes: i.notes,
      lastDoneAt: last.get(i.exerciseId)?.toISOString() ?? null,
    })),
  };
}

// ─── Sessões ──────────────────────────────────────────────────────────────────────────────────────

/** Fecha uma sessão aberta há mais de 6 h na hora da última série. Devolve `true` se fechou. */
async function closeIfStale(s: { id: string; startedAt: Date }, now: Date): Promise<boolean> {
  const lastSet = await db.sessionSet.findFirst({ where: { sessionId: s.id }, orderBy: { completedAt: 'desc' }, select: { completedAt: true } });
  const end = autoEndAt({ startedAt: s.startedAt, lastSetAt: lastSet?.completedAt ?? null, now });
  if (!end) return false;
  await db.fitnessSession.update({ where: { id: s.id }, data: { endedAt: end, restEndsAt: null } });
  return true;
}

/** A sessão activa (só o essencial: pílula e "Começar treino"). */
export async function getActiveSessionBrief(userId: string): Promise<{ id: string; startedAt: string } | null> {
  const s = await db.fitnessSession.findFirst({ where: { userId, endedAt: null }, orderBy: { startedAt: 'desc' }, select: { id: true, startedAt: true } });
  if (!s || (await closeIfStale(s, new Date()))) return null;
  return { id: s.id, startedAt: s.startedAt.toISOString() };
}

/** Última vez que o exercício foi feito antes desta sessão (as séries por ordem). */
async function lastPerformances(userId: string, exerciseIds: string[], excludeSessionId: string): Promise<Map<string, LastPerformance>> {
  const out = new Map<string, LastPerformance>();
  await Promise.all(
    exerciseIds.map(async (exerciseId) => {
      const latest = await db.sessionSet.findFirst({
        where: { userId, exerciseId, sessionId: { not: excludeSessionId } },
        orderBy: { completedAt: 'desc' },
        select: { sessionId: true, session: { select: { date: true } } },
      });
      if (!latest) return;
      const sets = await db.sessionSet.findMany({
        where: { sessionId: latest.sessionId, exerciseId },
        orderBy: { order: 'asc' },
        select: { reps: true, weightGrams: true, durationSec: true },
      });
      out.set(exerciseId, { date: fromDbDate(latest.session.date), sets });
    }),
  );
  return out;
}

const setView = (s: { id: string; order: number; reps: number | null; weightGrams: number | null; durationSec: number | null; completedAt: Date; prKinds: string[] }): SessionSetView => ({
  id: s.id,
  order: s.order,
  reps: s.reps,
  weightGrams: s.weightGrams,
  durationSec: s.durationSec,
  completedAt: s.completedAt.toISOString(),
  prKinds: s.prKinds,
});

/**
 * F17: recalcula os recordes de um exercício da pessoa (`recomputePrs`) e grava só as séries que mudaram.
 * Corre depois de registar (uma série enviada tarde pela fila pode mudar as seguintes), editar ou apagar.
 */
export async function recomputeExercisePrs(userId: string, exerciseId: string): Promise<Record<string, string[]>> {
  const sets = await db.sessionSet.findMany({
    where: { userId, exerciseId },
    select: { id: true, completedAt: true, reps: true, weightGrams: true, prKinds: true },
  });
  const next = recomputePrs(sets);
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  const changed = sets.filter((s) => !same(s.prKinds, next[s.id] ?? []));
  if (changed.length) {
    await db.$transaction(changed.map((s) => db.sessionSet.update({ where: { id: s.id }, data: { prKinds: next[s.id] ?? [] } })));
  }
  return next;
}

export async function getActiveSession(userId: string, locale: AppLocale): Promise<ActiveSessionView | null> {
  const s = await db.fitnessSession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: 'desc' },
    include: {
      workout: { select: { name: true, items: { orderBy: { order: 'asc' } } } },
      sets: { orderBy: [{ completedAt: 'asc' }] },
    },
  });
  if (!s || (await closeIfStale(s, new Date()))) return null;

  // Ordem: itens do treino, depois os acrescentados na sessão, depois qualquer outro com séries.
  const items = s.workout?.items ?? [];
  const order = [...items.map((i) => i.exerciseId), ...s.extraExercises, ...s.sets.map((x) => x.exerciseId)];
  const ids = [...new Set(order)];
  const [exercises, prefs, last] = await Promise.all([
    db.exercise.findMany({ where: { id: { in: ids } }, select: { ...EXERCISE_VIEW, defaultRestSec: true } }),
    getFitnessPrefs(userId),
    lastPerformances(userId, ids, s.id),
  ]);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const itemById = new Map(items.map((i) => [i.exerciseId, i]));

  return {
    id: s.id,
    workoutId: s.workoutId,
    workoutName: s.workout?.name ?? null,
    startedAt: s.startedAt.toISOString(),
    restEndsAt: s.restEndsAt?.toISOString() ?? null,
    restExerciseId: s.restExerciseId,
    notes: s.notes,
    items: ids.flatMap((id) => {
      const ex = byId.get(id);
      if (!ex) return [];
      const item = itemById.get(id) ?? null;
      return [
        {
          exercise: toExerciseView(ex, locale),
          target: {
            sets: item?.targetSets ?? null,
            repsMin: item?.targetRepsMin ?? null,
            repsMax: item?.targetRepsMax ?? null,
            sec: item?.targetSec ?? null,
            restSec: restFor(item, ex, prefs),
          },
          doneSets: s.sets.filter((x) => x.exerciseId === id).map(setView),
          last: last.get(id) ?? null,
        },
      ];
    }),
  };
}

export interface SessionListItem {
  id: string;
  name: string | null;
  date: DateISO;
  startedAt: string;
  durationSec: number;
  sets: number;
}

/** Sessões terminadas, mais recentes primeiro (a página agrupa por mês). */
export async function listSessions(userId: string, take = 200): Promise<SessionListItem[]> {
  const rows = await db.fitnessSession.findMany({
    where: { userId, endedAt: { not: null } },
    orderBy: { startedAt: 'desc' },
    take,
    select: { id: true, date: true, startedAt: true, endedAt: true, workout: { select: { name: true } }, _count: { select: { sets: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.workout?.name ?? null,
    date: fromDbDate(r.date),
    startedAt: r.startedAt.toISOString(),
    durationSec: Math.round((r.endedAt!.getTime() - r.startedAt.getTime()) / 1000),
    sets: r._count.sets,
  }));
}

export interface SessionSummary {
  id: string;
  name: string | null;
  date: DateISO;
  startedAt: string;
  durationSec: number;
  exercises: number;
  sets: number;
  reps: number;
  volumeGrams: number; // kg × reps, em gramas
  avgRestSec: number | null;
  byExercise: { exercise: ExerciseView; sets: SessionSetView[] }[];
}

export async function getSessionSummary(userId: string, id: string, locale: AppLocale): Promise<SessionSummary | null> {
  const s = await db.fitnessSession.findFirst({
    where: { id, userId },
    include: {
      workout: { select: { name: true } },
      sets: { orderBy: { completedAt: 'asc' }, include: { exercise: { select: EXERCISE_VIEW } } },
    },
  });
  if (!s) return null;
  const end = s.endedAt ?? s.sets[s.sets.length - 1]?.completedAt ?? s.startedAt;
  const rests = s.sets.slice(0, -1).map((x) => x.restSec).filter((r): r is number => r !== null);
  const groups = new Map<string, { exercise: ExerciseView; sets: SessionSetView[] }>();
  for (const x of s.sets) {
    const g = groups.get(x.exerciseId) ?? { exercise: toExerciseView(x.exercise, locale), sets: [] };
    g.sets.push(setView(x));
    groups.set(x.exerciseId, g);
  }
  return {
    id: s.id,
    name: s.workout?.name ?? null,
    date: fromDbDate(s.date),
    startedAt: s.startedAt.toISOString(),
    durationSec: Math.max(0, Math.round((end.getTime() - s.startedAt.getTime()) / 1000)),
    exercises: groups.size,
    sets: s.sets.length,
    reps: s.sets.reduce((n, x) => n + (x.reps ?? 0), 0),
    volumeGrams: s.sets.reduce((n, x) => n + (x.reps ?? 0) * (x.weightGrams ?? 0), 0),
    avgRestSec: rests.length ? Math.round(rests.reduce((a, b) => a + b, 0) / rests.length) : null,
    byExercise: [...groups.values()],
  };
}

// ─── Exercício: detalhe e histórico ───────────────────────────────────────────────────────────────

export async function getExerciseDetail(userId: string, id: string, locale: AppLocale) {
  const e = await db.exercise.findFirst({ where: { id, OR: [{ source: 'LIBRARY' }, { ownerId: userId }] } });
  if (!e) return null;
  return {
    view: toExerciseView(e, locale),
    level: e.level,
    images: e.images,
    instructions: exerciseInstructions(e.instructions as Record<string, string[]> | null, locale),
    archived: e.archivedAt !== null,
    defaultRestSec: e.defaultRestSec,
  };
}

/**
 * Histórico do exercício agrupado por sessão (mais recente primeiro). "Descanso antes" = tempo desde a série
 * anterior da mesma sessão (de qualquer exercício).
 */
export async function getExerciseHistory(userId: string, exerciseId: string, take = 40): Promise<ExerciseHistoryGroup[]> {
  const sessions = await db.fitnessSession.findMany({
    where: { userId, sets: { some: { exerciseId } } },
    orderBy: { startedAt: 'desc' },
    take,
    select: { id: true, date: true, sets: { orderBy: { completedAt: 'asc' }, select: { id: true, exerciseId: true, order: true, reps: true, weightGrams: true, durationSec: true, completedAt: true, prKinds: true } } },
  });
  return sessions.map((s) => ({
    date: fromDbDate(s.date),
    sessionId: s.id,
    sets: s.sets.flatMap((x, i) =>
      x.exerciseId === exerciseId
        ? [{
            id: x.id,
            order: x.order,
            time: x.completedAt.toISOString(),
            restBeforeSec: i > 0 ? Math.round((x.completedAt.getTime() - s.sets[i - 1]!.completedAt.getTime()) / 1000) : null,
            reps: x.reps,
            weightGrams: x.weightGrams,
            durationSec: x.durationSec,
            prKinds: x.prKinds,
          }]
        : [],
    ),
  }));
}
