'use server';

import { revalidatePath } from 'next/cache';
import type { ExerciseMeasure, ProgramKind } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { compareDates, fromDbDate, toDbDate, todayInTz } from '@/lib/dates';
import { requireFeature } from '@/lib/entitlements/server';
import { translatorFor } from '@/i18n/translator';
import { sendSafely, type FitnessRestEvent } from '@/inngest/client';
import { patchDailyEntry } from '@/actions/daily';
import { findTemplate } from '@/lib/fitness/templates';
import { getFitnessPrefs, usableExercise } from '@/lib/fitness/queries';
import { diaryChecksFor, restEndsAt, restFor, validateSet } from '@/lib/fitness/session';

/**
 * Acções do Foco no corpo (F16). Todas: sessão, `requireFeature('body-pro')` (sem acesso → 404), Zod e
 * verificação de dono. Os tempos gravam-se como timestamps (`startedAt`, `restEndsAt`).
 */
export type FitnessResult<T = undefined> = ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };

const fail = (error = 'common.errors.generic') => ({ ok: false as const, error });
const ok = () => ({ ok: true as const });

async function userId(): Promise<string | null> {
  const s = await auth();
  if (!s?.user?.id) return null;
  await requireFeature(s.user.id, 'body-pro');
  return s.user.id;
}

const refresh = () => revalidatePath('/body', 'layout');

const id = z.string().min(1).max(191);
const ids = z.array(id).max(200);
const text = (max: number) => z.string().trim().max(max);
const optText = (max: number) => text(max).nullable().optional().transform((v) => (v ? v : null));

async function nextOrder(model: 'program' | 'workout' | 'item', where: Record<string, string>): Promise<number> {
  const agg =
    model === 'program'
      ? await db.fitnessProgram.aggregate({ where, _max: { order: true } })
      : model === 'workout'
        ? await db.fitnessWorkout.aggregate({ where, _max: { order: true } })
        : await db.workoutItem.aggregate({ where, _max: { order: true } });
  return (agg._max.order ?? -1) + 1;
}

// ─── Preferências e onboarding ────────────────────────────────────────────────────────────────────

const prefsSchema = z.object({
  defaultRestSec: z.number().int().min(10).max(900).optional(),
  restAlert: z.boolean().optional(),
  keepAwake: z.boolean().optional(),
});

export async function updateFitnessPrefs(patch: z.input<typeof prefsSchema>): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  const p = prefsSchema.safeParse(patch);
  if (!p.success) return fail();
  await db.fitnessPrefs.upsert({ where: { userId: uid }, create: { userId: uid, ...p.data }, update: p.data });
  refresh();
  return ok();
}

/** Cria um programa (com treinos e itens) a partir de um modelo, com os nomes na língua da pessoa. */
async function copyTemplateFor(uid: string, templateId: string): Promise<string | null> {
  const tpl = findTemplate(templateId);
  if (!tpl) return null;
  const user = await db.user.findUnique({ where: { id: uid }, select: { locale: true } });
  const t = translatorFor(user?.locale ?? 'PT_PT');
  const existing = await db.exercise.findMany({ where: { id: { in: tpl.workouts.flatMap((w) => w.items.map((i) => i.exerciseId)) } }, select: { id: true } });
  const known = new Set(existing.map((e) => e.id));
  const order = await nextOrder('program', { userId: uid });
  const program = await db.fitnessProgram.create({
    data: {
      userId: uid,
      name: t(`fitness.templates.${tpl.id}.name`),
      description: t(`fitness.templates.${tpl.id}.description`),
      kind: tpl.kind,
      order,
      workouts: {
        create: tpl.workouts.map((w, wi) => ({
          userId: uid,
          name: t(`fitness.templates.${tpl.id}.workouts.${w.key}`),
          order: wi,
          items: {
            create: w.items
              .filter((i) => known.has(i.exerciseId))
              .map((i, ii) => ({
                exerciseId: i.exerciseId,
                order: ii,
                targetSets: i.sets,
                targetRepsMin: i.repsMin ?? null,
                targetRepsMax: i.repsMax ?? null,
                targetSec: i.sec ?? null,
                restSec: i.restSec ?? null,
              })),
          },
        })),
      },
    },
    select: { id: true },
  });
  return program.id;
}

const onboardingSchema = z.object({
  defaultRestSec: z.number().int().min(10).max(900),
  restAlert: z.boolean(),
  templateId: z.string().max(40).nullable().optional(),
});

export async function completeFitnessOnboarding(input: z.input<typeof onboardingSchema>): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  const p = onboardingSchema.safeParse(input);
  if (!p.success) return fail();
  const data = { defaultRestSec: p.data.defaultRestSec, restAlert: p.data.restAlert, onboardedAt: new Date() };
  await db.fitnessPrefs.upsert({ where: { userId: uid }, create: { userId: uid, ...data }, update: data });
  if (p.data.templateId) await copyTemplateFor(uid, p.data.templateId);
  refresh();
  return ok();
}

// ─── Programas ────────────────────────────────────────────────────────────────────────────────────

const programSchema = z.object({ name: text(80).min(1), description: optText(280), kind: z.enum(['STRENGTH', 'STRETCH', 'MIXED']).optional() });

export async function createProgram(input: z.input<typeof programSchema>): Promise<FitnessResult<{ id: string }>> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  const p = programSchema.safeParse(input);
  if (!p.success) return fail('fitness.errors.name');
  const order = await nextOrder('program', { userId: uid });
  const program = await db.fitnessProgram.create({
    data: { userId: uid, name: p.data.name, description: p.data.description, kind: (p.data.kind ?? 'STRENGTH') as ProgramKind, order },
    select: { id: true },
  });
  refresh();
  return { ok: true, data: { id: program.id } };
}

export async function updateProgram(programId: string, input: z.input<typeof programSchema>): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  const p = programSchema.safeParse(input);
  if (!id.safeParse(programId).success || !p.success) return fail('fitness.errors.name');
  const { count } = await db.fitnessProgram.updateMany({ where: { id: programId, userId: uid }, data: p.data });
  if (!count) return fail();
  refresh();
  return ok();
}

export async function archiveProgram(programId: string): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(programId).success) return fail();
  await db.fitnessProgram.updateMany({ where: { id: programId, userId: uid }, data: { archivedAt: new Date() } });
  refresh();
  return ok();
}

export async function reorderPrograms(order: string[]): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!ids.safeParse(order).success) return fail();
  await db.$transaction(order.map((pid, i) => db.fitnessProgram.updateMany({ where: { id: pid, userId: uid }, data: { order: i } })));
  refresh();
  return ok();
}

export async function copyTemplate(templateId: string): Promise<FitnessResult<{ id: string }>> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!z.string().max(40).safeParse(templateId).success) return fail();
  const created = await copyTemplateFor(uid, templateId);
  if (!created) return fail();
  refresh();
  return { ok: true, data: { id: created } };
}

// ─── Treinos ──────────────────────────────────────────────────────────────────────────────────────

const workoutSchema = z.object({ name: text(80).min(1), notes: optText(500) });

export async function createWorkout(programId: string, input: z.input<typeof workoutSchema>): Promise<FitnessResult<{ id: string }>> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  const p = workoutSchema.safeParse(input);
  if (!id.safeParse(programId).success || !p.success) return fail('fitness.errors.name');
  const program = await db.fitnessProgram.findFirst({ where: { id: programId, userId: uid, archivedAt: null }, select: { id: true } });
  if (!program) return fail();
  const order = await nextOrder('workout', { programId });
  const w = await db.fitnessWorkout.create({ data: { programId, userId: uid, name: p.data.name, notes: p.data.notes, order }, select: { id: true } });
  refresh();
  return { ok: true, data: { id: w.id } };
}

export async function updateWorkout(workoutId: string, input: z.input<typeof workoutSchema>): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  const p = workoutSchema.safeParse(input);
  if (!id.safeParse(workoutId).success || !p.success) return fail('fitness.errors.name');
  const { count } = await db.fitnessWorkout.updateMany({ where: { id: workoutId, userId: uid }, data: p.data });
  if (!count) return fail();
  refresh();
  return ok();
}

export async function archiveWorkout(workoutId: string): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(workoutId).success) return fail();
  await db.fitnessWorkout.updateMany({ where: { id: workoutId, userId: uid }, data: { archivedAt: new Date() } });
  refresh();
  return ok();
}

export async function reorderWorkouts(programId: string, order: string[]): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(programId).success || !ids.safeParse(order).success) return fail();
  await db.$transaction(order.map((wid, i) => db.fitnessWorkout.updateMany({ where: { id: wid, programId, userId: uid }, data: { order: i } })));
  refresh();
  return ok();
}

// ─── Itens do treino ──────────────────────────────────────────────────────────────────────────────

async function ownWorkout(uid: string, workoutId: string) {
  return db.fitnessWorkout.findFirst({ where: { id: workoutId, userId: uid }, select: { id: true, program: { select: { kind: true } } } });
}

/** Alvo por defeito ao acrescentar: 3 × 8–12 (ou 3 × 30 s nos exercícios de tempo). */
function defaultTarget(measure: ExerciseMeasure, kind: ProgramKind) {
  if (measure === 'DURATION') return { targetSets: kind === 'STRETCH' ? 1 : 3, targetSec: 30 };
  return { targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 };
}

export async function addWorkoutItems(workoutId: string, exerciseIds: string[]): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(workoutId).success || !ids.min(1).safeParse(exerciseIds).success) return fail();
  const w = await ownWorkout(uid, workoutId);
  if (!w) return fail();
  const exercises = await db.exercise.findMany({
    where: { id: { in: exerciseIds }, archivedAt: null, OR: [{ source: 'LIBRARY' }, { ownerId: uid }] },
    select: { id: true, measure: true },
  });
  const byId = new Map(exercises.map((e) => [e.id, e]));
  let order = await nextOrder('item', { workoutId });
  await db.workoutItem.createMany({
    data: exerciseIds.flatMap((eid) => {
      const e = byId.get(eid);
      return e ? [{ workoutId, exerciseId: eid, order: order++, ...defaultTarget(e.measure, w.program.kind) }] : [];
    }),
  });
  refresh();
  return ok();
}

const itemSchema = z.object({
  targetSets: z.number().int().min(1).max(20).nullable().optional(),
  targetRepsMin: z.number().int().min(1).max(200).nullable().optional(),
  targetRepsMax: z.number().int().min(1).max(200).nullable().optional(),
  targetSec: z.number().int().min(1).max(3600).nullable().optional(),
  restSec: z.number().int().min(0).max(900).nullable().optional(),
  notes: optText(280),
});

export async function updateWorkoutItem(itemId: string, patch: z.input<typeof itemSchema>): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  const p = itemSchema.safeParse(patch);
  if (!id.safeParse(itemId).success || !p.success) return fail();
  const data = Object.fromEntries(Object.entries(p.data).filter(([k]) => k in (patch as object)));
  if (data.targetRepsMin != null && data.targetRepsMax != null && (data.targetRepsMax as number) < (data.targetRepsMin as number)) {
    data.targetRepsMax = data.targetRepsMin;
  }
  const { count } = await db.workoutItem.updateMany({ where: { id: itemId, workout: { userId: uid } }, data });
  if (!count) return fail();
  refresh();
  return ok();
}

export async function removeWorkoutItem(itemId: string): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(itemId).success) return fail();
  await db.workoutItem.deleteMany({ where: { id: itemId, workout: { userId: uid } } });
  refresh();
  return ok();
}

export async function reorderWorkoutItems(workoutId: string, order: string[]): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(workoutId).success || !ids.safeParse(order).success) return fail();
  await db.$transaction(order.map((iid, i) => db.workoutItem.updateMany({ where: { id: iid, workoutId, workout: { userId: uid } }, data: { order: i } })));
  refresh();
  return ok();
}

// ─── Exercícios próprios ──────────────────────────────────────────────────────────────────────────

const customSchema = z.object({
  name: text(80).min(1),
  measure: z.enum(['REPS_WEIGHT', 'REPS', 'DURATION']),
  category: z.enum(['strength', 'stretching', 'cardio', 'plyometrics']).optional(),
  primaryMuscles: z.array(z.string().max(30)).max(5).default([]),
  equipment: z.string().max(30).nullable().optional(),
});

export async function createCustomExercise(input: z.input<typeof customSchema>): Promise<FitnessResult<{ id: string }>> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  const p = customSchema.safeParse(input);
  if (!p.success) return fail('fitness.errors.name');
  const { name, measure, primaryMuscles, equipment } = p.data;
  const e = await db.exercise.create({
    data: {
      id: `custom_${crypto.randomUUID()}`,
      source: 'CUSTOM',
      ownerId: uid,
      names: { en: name, 'pt-PT': name, 'pt-BR': name },
      category: p.data.category ?? (measure === 'DURATION' ? 'stretching' : 'strength'),
      measure,
      primaryMuscles,
      secondaryMuscles: [],
      equipment: equipment ?? null,
      images: [],
    },
    select: { id: true },
  });
  refresh();
  return { ok: true, data: { id: e.id } };
}

export async function updateCustomExercise(exerciseId: string, input: z.input<typeof customSchema>): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  const p = customSchema.safeParse(input);
  if (!id.safeParse(exerciseId).success || !p.success) return fail('fitness.errors.name');
  const { name, measure, primaryMuscles, equipment, category } = p.data;
  const { count } = await db.exercise.updateMany({
    where: { id: exerciseId, ownerId: uid, source: 'CUSTOM' },
    data: { names: { en: name, 'pt-PT': name, 'pt-BR': name }, measure, primaryMuscles, equipment: equipment ?? null, ...(category && { category }) },
  });
  if (!count) return fail();
  refresh();
  return ok();
}

export async function archiveCustomExercise(exerciseId: string): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(exerciseId).success) return fail();
  await db.exercise.updateMany({ where: { id: exerciseId, ownerId: uid, source: 'CUSTOM' }, data: { archivedAt: new Date() } });
  refresh();
  return ok();
}

// ─── Sessão ───────────────────────────────────────────────────────────────────────────────────────

async function activeSession(uid: string, sessionId: string) {
  return db.fitnessSession.findFirst({
    where: { id: sessionId, userId: uid, endedAt: null },
    include: { workout: { select: { items: { select: { exerciseId: true, restSec: true } }, program: { select: { kind: true } } } } },
  });
}

/** Começa um treino (ou um treino livre). Já havendo uma sessão activa, devolve essa. */
export async function startSession(workoutId: string | null): Promise<FitnessResult<{ id: string; existing: boolean }>> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (workoutId !== null && !id.safeParse(workoutId).success) return fail();
  const active = await db.fitnessSession.findFirst({ where: { userId: uid, endedAt: null }, select: { id: true } });
  if (active) return { ok: true, data: { id: active.id, existing: true } };
  if (workoutId && !(await ownWorkout(uid, workoutId))) return fail();
  const user = await db.user.findUnique({ where: { id: uid }, select: { timezone: true } });
  const now = new Date();
  const s = await db.fitnessSession.create({
    data: { userId: uid, workoutId, date: toDbDate(todayInTz(user?.timezone ?? 'UTC', now)), startedAt: now },
    select: { id: true },
  });
  refresh();
  return { ok: true, data: { id: s.id, existing: false } };
}

const setSchema = z.object({
  /** Id gerado no cliente: repetir o pedido (fila sem rede) não duplica a série. */
  id: z.string().regex(/^[a-z0-9]{16,40}$/).optional(),
  exerciseId: id,
  reps: z.number().int().optional(),
  weightGrams: z.number().int().optional(),
  durationSec: z.number().int().optional(),
  /** Hora real da série (registada sem rede e enviada mais tarde). */
  completedAt: z.string().datetime().optional(),
});

export async function logSet(
  sessionId: string,
  input: z.input<typeof setSchema>,
): Promise<FitnessResult<{ setId: string; restEndsAt: string | null }>> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  const p = setSchema.safeParse(input);
  if (!id.safeParse(sessionId).success || !p.success) return fail('fitness.errors.set');
  const s = await activeSession(uid, sessionId);
  if (!s) return fail('fitness.errors.noSession');
  const exercise = await usableExercise(uid, p.data.exerciseId);
  if (!exercise) return fail();
  const check = validateSet(exercise.measure, p.data);
  if (!check.ok) return fail(`fitness.errors.${check.reason}`);

  if (p.data.id) {
    const dup = await db.sessionSet.findUnique({ where: { id: p.data.id }, select: { id: true, sessionId: true } });
    if (dup) return dup.sessionId === s.id ? { ok: true, data: { setId: dup.id, restEndsAt: s.restEndsAt?.toISOString() ?? null } } : fail();
  }

  const now = new Date();
  const client = p.data.completedAt ? new Date(p.data.completedAt) : null;
  const completedAt = client && client >= s.startedAt && client <= new Date(now.getTime() + 60_000) ? client : now;
  const [prefs, count] = await Promise.all([
    getFitnessPrefs(uid),
    db.sessionSet.count({ where: { sessionId: s.id, exerciseId: exercise.id } }),
  ]);
  const item = s.workout?.items.find((i) => i.exerciseId === exercise.id) ?? null;
  const rest = restFor(item, exercise, prefs);
  const ends = restEndsAt(completedAt, rest);

  const set = await db.sessionSet.create({
    data: {
      ...(p.data.id && { id: p.data.id }),
      sessionId: s.id,
      userId: uid,
      exerciseId: exercise.id,
      order: count + 1,
      reps: p.data.reps ?? null,
      weightGrams: p.data.weightGrams ?? null,
      durationSec: p.data.durationSec ?? null,
      completedAt,
      restSec: rest,
    },
    select: { id: true },
  });
  // O descanso só começa se ainda não acabou (uma série enviada tarde pela fila não reabre o descanso).
  const restOn = ends > now;
  await db.fitnessSession.update({
    where: { id: s.id },
    data: { restEndsAt: restOn ? ends : null, restExerciseId: restOn ? exercise.id : null },
  });
  if (restOn && prefs.restAlert) await sendRestEvent(uid, s.id, ends);
  return { ok: true, data: { setId: set.id, restEndsAt: restOn ? ends.toISOString() : null } };
}

async function sendRestEvent(uid: string, sessionId: string, ends: Date): Promise<void> {
  const event: FitnessRestEvent = { name: 'fitness/rest.started', data: { userId: uid, sessionId, restEndsAt: ends.toISOString() } };
  await sendSafely([event]);
}

const setPatchSchema = z.object({
  reps: z.number().int().nullable().optional(),
  weightGrams: z.number().int().nullable().optional(),
  durationSec: z.number().int().nullable().optional(),
});

export async function updateSet(setId: string, patch: z.input<typeof setPatchSchema>): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  const p = setPatchSchema.safeParse(patch);
  if (!id.safeParse(setId).success || !p.success) return fail('fitness.errors.set');
  const set = await db.sessionSet.findFirst({ where: { id: setId, userId: uid }, include: { exercise: { select: { measure: true } } } });
  if (!set) return fail();
  const next = {
    exerciseId: set.exerciseId,
    reps: (p.data.reps === undefined ? set.reps : p.data.reps) ?? undefined,
    weightGrams: (p.data.weightGrams === undefined ? set.weightGrams : p.data.weightGrams) ?? undefined,
    durationSec: (p.data.durationSec === undefined ? set.durationSec : p.data.durationSec) ?? undefined,
  };
  const check = validateSet(set.exercise.measure, next);
  if (!check.ok) return fail(`fitness.errors.${check.reason}`);
  await db.sessionSet.update({
    where: { id: setId },
    data: { reps: next.reps ?? null, weightGrams: next.weightGrams ?? null, durationSec: next.durationSec ?? null },
  });
  refresh();
  return ok();
}

export async function deleteSet(setId: string): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(setId).success) return fail();
  await db.sessionSet.deleteMany({ where: { id: setId, userId: uid } });
  refresh();
  return ok();
}

export async function skipRest(sessionId: string): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(sessionId).success) return fail();
  await db.fitnessSession.updateMany({ where: { id: sessionId, userId: uid, endedAt: null }, data: { restEndsAt: null, restExerciseId: null } });
  return ok();
}

/** +30 s ou −15 s ao descanso em curso. Um novo aviso substitui o anterior (o job confirma o restEndsAt). */
export async function addRest(sessionId: string, seconds: number): Promise<FitnessResult<{ restEndsAt: string | null }>> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(sessionId).success || !z.number().int().min(-300).max(300).safeParse(seconds).success) return fail();
  const s = await db.fitnessSession.findFirst({ where: { id: sessionId, userId: uid, endedAt: null }, select: { restEndsAt: true } });
  if (!s?.restEndsAt) return { ok: true, data: { restEndsAt: null } };
  const now = new Date();
  const ends = new Date(Math.max(now.getTime(), s.restEndsAt.getTime() + seconds * 1000));
  const on = ends > now;
  await db.fitnessSession.update({ where: { id: sessionId }, data: { restEndsAt: on ? ends : null, ...(on ? {} : { restExerciseId: null }) } });
  const prefs = await getFitnessPrefs(uid);
  if (on && prefs.restAlert) await sendRestEvent(uid, sessionId, ends);
  return { ok: true, data: { restEndsAt: on ? ends.toISOString() : null } };
}

/** App em segundo plano? Decide se o fim do descanso vai por push. */
export async function setClientHidden(sessionId: string, hidden: boolean): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(sessionId).success || typeof hidden !== 'boolean') return fail();
  await db.fitnessSession.updateMany({ where: { id: sessionId, userId: uid, endedAt: null }, data: { clientHidden: hidden } });
  return ok();
}

/** "+ Exercício": acrescenta à sessão (o treino guardado não muda). */
export async function addSessionExercise(sessionId: string, exerciseId: string): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(sessionId).success || !id.safeParse(exerciseId).success) return fail();
  const s = await activeSession(uid, sessionId);
  if (!s || !(await usableExercise(uid, exerciseId))) return fail();
  if (!s.extraExercises.includes(exerciseId)) {
    await db.fitnessSession.update({ where: { id: s.id }, data: { extraExercises: { push: exerciseId } } });
  }
  refresh();
  return ok();
}

export async function setSessionNotes(sessionId: string, notes: string): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  const n = optText(1000).safeParse(notes);
  if (!id.safeParse(sessionId).success || !n.success) return fail();
  await db.fitnessSession.updateMany({ where: { id: sessionId, userId: uid }, data: { notes: n.data } });
  return ok();
}

/** Termina: grava o fim e marca os checks do diário pelo caminho normal do diário (o Glow do dia conta). */
export async function endSession(sessionId: string): Promise<FitnessResult<{ id: string }>> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(sessionId).success) return fail();
  const s = await activeSession(uid, sessionId);
  if (!s) return fail('fitness.errors.noSession');
  const sets = await db.sessionSet.findMany({ where: { sessionId: s.id }, select: { exercise: { select: { category: true } } } });
  await db.fitnessSession.update({ where: { id: s.id }, data: { endedAt: new Date(), restEndsAt: null, restExerciseId: null, clientHidden: false } });

  const checks = diaryChecksFor({
    setsCount: sets.length,
    programKind: s.workout?.program.kind ?? null,
    exerciseCategories: [...new Set(sets.map((x) => x.exercise.category))],
  });
  // Só marca, nunca desmarca. Um dia futuro (fuso mudou entretanto) fica de fora.
  const date = fromDbDate(s.date);
  const user = await db.user.findUnique({ where: { id: uid }, select: { timezone: true } });
  if ((checks.workoutDone || checks.stretchDone) && compareDates(date, todayInTz(user?.timezone ?? 'UTC')) <= 0) {
    await patchDailyEntry(date, { ...(checks.workoutDone && { workoutDone: true }), ...(checks.stretchDone && { stretchDone: true }) });
  }
  refresh();
  revalidatePath('/today');
  return { ok: true, data: { id: s.id } };
}

/** Descarta uma sessão sem séries. */
export async function discardSession(sessionId: string): Promise<FitnessResult> {
  const uid = await userId();
  if (!uid) return fail('common.errors.unauthorized');
  if (!id.safeParse(sessionId).success) return fail();
  const sets = await db.sessionSet.count({ where: { sessionId } });
  if (sets > 0) return fail('fitness.errors.hasSets');
  await db.fitnessSession.deleteMany({ where: { id: sessionId, userId: uid, endedAt: null } });
  refresh();
  return ok();
}
