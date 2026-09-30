'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { hasPush } from '@/lib/env';
import { allowTestNotification } from '@/lib/ratelimit';
import { pushSubscriptionSchema, type PushSubscriptionInput } from '@/lib/validation/notifications';
import { testNotification } from '@/lib/notifications/content';
import { pushToUser } from '@/lib/notifications/send';

export type PushActionResult = { ok: true } | { ok: false; error: string };
export type TestResult = { ok: true; sent: number; devices: number; configured: boolean } | { ok: false; error: string };

export interface DeviceInfo {
  endpoint: string;
  userAgent: string | null;
  createdAt: string;
}

async function currentUser() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Guarda (ou move para o utilizador actual) a subscrição push deste dispositivo. */
export async function savePushSubscription(sub: PushSubscriptionInput, userAgent: string): Promise<PushActionResult> {
  const userId = await currentUser();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = pushSubscriptionSchema.safeParse(sub);
  if (!parsed.success) return { ok: false, error: 'notifications.errors.invalid' };
  const { endpoint, keys } = parsed.data;
  const ua = typeof userAgent === 'string' ? userAgent.slice(0, 300) : null;

  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: ua },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent: ua },
  });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<PushActionResult> {
  const userId = await currentUser();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  if (!z.string().url().safeParse(endpoint).success) return { ok: false, error: 'notifications.errors.invalid' };
  await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
  return { ok: true };
}

export async function listDevices(): Promise<DeviceInfo[]> {
  const userId = await currentUser();
  if (!userId) return [];
  const rows = await db.pushSubscription.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { endpoint: true, userAgent: true, createdAt: true },
  });
  return rows.map((r) => ({ endpoint: r.endpoint, userAgent: r.userAgent, createdAt: r.createdAt.toISOString() }));
}

/** "Tudo pronto ✨" para todos os dispositivos (3/hora; não fica na caixa de avisos). */
export async function sendTestNotification(): Promise<TestResult> {
  const userId = await currentUser();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  if (!(await allowTestNotification(userId))) return { ok: false, error: 'notifications.errors.rateLimited' };
  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true } });
  if (!user) return { ok: false, error: 'common.errors.unauthorized' };
  const devices = await db.pushSubscription.count({ where: { userId } });
  const sent = await pushToUser(userId, { ...testNotification(user.locale), tag: 'TEST' });
  return { ok: true, sent, devices, configured: hasPush() };
}
