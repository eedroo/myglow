'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { UNLOCK_IDS, type UnlockId } from '@/lib/journey/stages';

type Result = { ok: true } | { ok: false; error: string };

const ceremonySchema = z.object({ unlockId: z.enum(UNLOCK_IDS as [UnlockId, ...UnlockId[]]), dismissed: z.boolean() });

/** F19: mini-lição vista (ou fechada antes do fim: `dismissed`). Só a primeira vez conta para as métricas. */
export async function markCeremonySeen(unlockId: UnlockId, dismissed: boolean): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const p = ceremonySchema.safeParse({ unlockId, dismissed });
  if (!p.success) return { ok: false, error: 'common.errors.invalid' };
  await db.journeyUnlock.updateMany({
    where: { userId: session.user.id, unlockId: p.data.unlockId, ceremonySeenAt: null },
    data: { ceremonySeenAt: new Date(), ceremonyDismissed: p.data.dismissed },
  });
  return { ok: true };
}

/** F19: "Já conheço, desbloquear tudo": diário completo, Mês e Ano; nenhuma mini-lição fica por ver. */
export async function unlockAll(): Promise<Result> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'common.errors.unauthorized' };
  const userId = session.user.id;
  const now = new Date();
  const ids: UnlockId[] = ['stage-2', 'stage-3', 'stage-4', 'stage-5', 'month-year'];
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { journeyAllUnlockedAt: now, journeyStage: 5 } }),
    // Mini-lições por ver ficam como dispensadas; os desbloqueios novos não contam nas métricas (unlockedAt = agora).
    db.journeyUnlock.updateMany({ where: { userId, ceremonySeenAt: null }, data: { ceremonySeenAt: now, ceremonyDismissed: true } }),
    db.journeyUnlock.createMany({ data: ids.map((unlockId) => ({ userId, unlockId, unlockedAt: now, ceremonySeenAt: now })), skipDuplicates: true }),
  ]);
  revalidatePath('/', 'layout');
  return { ok: true };
}
