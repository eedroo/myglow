'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { levelFor } from '@/lib/xp/levels';

/** Marca o nível actual como visto (fecha o diálogo de subida em todos os dispositivos). */
export async function markLevelSeen(): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { xpTotal: true } });
  if (!user) return { ok: false };
  await db.user.update({ where: { id: session.user.id }, data: { levelSeen: levelFor(user.xpTotal).level } });
  return { ok: true };
}
