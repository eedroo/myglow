'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { markRecapCompleted, markRecapSeen } from '@/lib/recap/server';
import { recapPeriod, type RecapKindKey, type RecapPeriod } from '@/lib/recap/period';

export type RecapActionResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  kind: z.enum(['WEEK', 'MONTH']),
  key: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
});

async function withPeriod(kind: RecapKindKey, key: string, fn: (userId: string, p: RecapPeriod) => Promise<void>): Promise<RecapActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = schema.safeParse({ kind, key });
  if (!parsed.success) return { ok: false, error: 'common.errors.generic' };
  let period: RecapPeriod;
  try {
    period = recapPeriod(parsed.data.kind, parsed.data.key);
  } catch {
    return { ok: false, error: 'common.errors.generic' };
  }
  await fn(session.user.id, period);
  return { ok: true };
}

/** O player abriu: grava a vista (o ponto dourado desaparece e não volta a abrir sozinha). */
export async function recapSeen(kind: RecapKindKey, key: string): Promise<RecapActionResult> {
  return withPeriod(kind, key, markRecapSeen);
}

/** Chegou ao último slide. */
export async function recapCompleted(kind: RecapKindKey, key: string): Promise<RecapActionResult> {
  return withPeriod(kind, key, markRecapCompleted);
}
