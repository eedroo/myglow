import 'server-only';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sendSafely, type FitnessRestEvent } from '@/inngest/client';
import { getFitnessPrefs, recomputeExercisePrs, usableExercise } from './queries';
import { restEndsAt, restFor, validateSet } from './session';

/**
 * Escritas da sessão partilhadas pela Server Action e pela rota `/api/fitness/sessions/[id]` (F16, F18).
 * A fila sem rede, a visibilidade e as notas usam a rota: uma Server Action que falha sem rede (app a voltar do
 * segundo plano) deita abaixo o router do Next e deixa o ecrã de erro até a app ser fechada.
 */
type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error = 'common.errors.generic') => ({ ok: false as const, error });
const id = z.string().min(1).max(191);

export async function activeSession(uid: string, sessionId: string) {
  return db.fitnessSession.findFirst({
    where: { id: sessionId, userId: uid, endedAt: null },
    include: { workout: { select: { items: { select: { exerciseId: true, restSec: true } }, program: { select: { kind: true } } } } },
  });
}

export const setSchema = z.object({
  /** Id gerado no cliente: repetir o pedido (fila sem rede) não duplica a série. */
  id: z.string().regex(/^[a-z0-9]{16,40}$/).optional(),
  exerciseId: id,
  reps: z.number().int().optional(),
  weightGrams: z.number().int().optional(),
  durationSec: z.number().int().optional(),
  /** Hora real da série (registada sem rede e enviada mais tarde). */
  completedAt: z.string().datetime().optional(),
});

export type SetPayload = z.input<typeof setSchema>;

export async function logSetFor(uid: string, sessionId: string, input: SetPayload): Promise<Result<{ setId: string; restEndsAt: string | null; prKinds: string[] }>> {
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
    if (dup) return dup.sessionId === s.id ? { ok: true, data: { setId: dup.id, restEndsAt: s.restEndsAt?.toISOString() ?? null, prKinds: [] } } : fail();
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
  // F17: recordes (recalculados para o exercício todo: uma série vinda da fila pode ser anterior a outras).
  const prs = await recomputeExercisePrs(uid, exercise.id);
  return { ok: true, data: { setId: set.id, restEndsAt: restOn ? ends.toISOString() : null, prKinds: prs[set.id] ?? [] } };
}

export async function sendRestEvent(uid: string, sessionId: string, ends: Date): Promise<void> {
  const event: FitnessRestEvent = { name: 'fitness/rest.started', data: { userId: uid, sessionId, restEndsAt: ends.toISOString() } };
  await sendSafely([event]);
}

