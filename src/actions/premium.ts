'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';

export type PremiumResult = { ok: true } | { ok: false; error: string };

/** "Quero saber quando abrir": grava a data só da primeira vez (idempotente). */
export async function registerPremiumInterest(): Promise<PremiumResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  await db.user.updateMany({ where: { id: session.user.id, premiumInterestAt: null }, data: { premiumInterestAt: new Date() } });
  return { ok: true };
}
