'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { notificationPrefsSchema, type NotificationPrefsData } from '@/lib/validation/notifications';

export type NotificationsActionResult = { ok: true } | { ok: false; error: string };

async function currentUser() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Preferências dos lembretes (cria o registo se faltar em contas antigas). */
export async function saveNotificationPrefs(input: NotificationPrefsData): Promise<NotificationsActionResult> {
  const userId = await currentUser();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = notificationPrefsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'notifications.errors.invalid' };
  await db.notificationPrefs.upsert({ where: { userId }, create: { userId, ...parsed.data }, update: parsed.data });
  return { ok: true };
}

export async function markNotificationRead(id: string): Promise<NotificationsActionResult> {
  const userId = await currentUser();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  if (!z.string().min(1).max(40).safeParse(id).success) return { ok: false, error: 'notifications.errors.invalid' };
  await db.notificationLog.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<NotificationsActionResult> {
  const userId = await currentUser();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  await db.notificationLog.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  return { ok: true };
}
