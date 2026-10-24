'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { TOUR_STEPS } from '@/lib/tour/steps';

export type TourActionResult = { ok: true } | { ok: false; error: string };

const stepIds = TOUR_STEPS.map((s) => s.id) as [string, ...string[]];
const saveSchema = z.object({ stepId: z.enum(stepIds).nullable(), status: z.enum(['active', 'paused', 'done']) });

/** Grava o passo do guia a cada mudança (o cliente não espera): permite retomar noutro dispositivo. */
export async function saveTourState(stepId: string | null, status: 'active' | 'paused' | 'done'): Promise<TourActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = saveSchema.safeParse({ stepId, status });
  if (!parsed.success) return { ok: false, error: 'common.errors.generic' };
  const now = new Date();
  const data =
    parsed.data.status === 'done'
      ? { tourStep: null, tourCompletedAt: now, tourPausedAt: null }
      : { tourStep: parsed.data.stepId, tourPausedAt: parsed.data.status === 'paused' ? now : null };
  await db.user.update({ where: { id: session.user.id }, data });
  return { ok: true };
}

/** Perfil → "Fazer o guia": recomeça do primeiro passo. */
export async function restartTour(): Promise<TourActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  await db.user.update({
    where: { id: session.user.id },
    data: { tourStep: TOUR_STEPS[0]!.id, tourStartedAt: new Date(), tourCompletedAt: null, tourPausedAt: null },
  });
  return { ok: true };
}
