'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { sendSafely } from '@/inngest/client';
import { ANNOUNCEMENT_KEYS } from '@/lib/journey/announcements';

type Result = { ok: true; queued: boolean } | { ok: false; error: string };

const keySchema = z.enum(ANNOUNCEMENT_KEYS);

/**
 * F19 (admin): publica um anúncio. Activa os slides de novidades e dispara o envio (caixa + push) a todos os
 * utilizadores existentes, em lotes; o envio é idempotente pelo NotificationLog, por isso publicar duas vezes é seguro.
 */
export async function publishAnnouncement(key: string): Promise<Result> {
  await requireAdmin();
  const p = keySchema.safeParse(key);
  if (!p.success) return { ok: false, error: 'Anúncio desconhecido.' };
  await db.announcement.upsert({ where: { key: p.data }, create: { key: p.data }, update: {} });
  const queued = await sendSafely([{ name: 'announcement/fanout', data: { key: p.data } }]);
  revalidatePath('/admin');
  return { ok: true, queued };
}

/** F19: slides de novidades vistos (uma vez por anúncio). */
export async function markAnnouncementSeen(key: string): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };
  const p = keySchema.safeParse(key);
  if (!p.success) return { ok: false };
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { announcementSeen: true } });
  if (user && !user.announcementSeen.includes(p.data)) {
    await db.user.update({ where: { id: session.user.id }, data: { announcementSeen: { push: p.data } } });
  }
  return { ok: true };
}
