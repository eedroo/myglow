'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';

const keysSchema = z.array(z.string().regex(/^(release|course):[a-z0-9-]+$/)).min(1).max(20);

/** Marca as novidades mostradas como vistas (não voltam a aparecer). */
export async function markAnnouncementsSeen(keys: string[]): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };
  const parsed = keysSchema.safeParse([...new Set(keys)]);
  if (!parsed.success) return { ok: false };
  await db.announcementSeen.createMany({
    data: parsed.data.map((key) => ({ userId: session.user.id, key })),
    skipDuplicates: true,
  });
  return { ok: true };
}
