import 'server-only';
import webpush, { WebPushError } from 'web-push';
import { Prisma, type NotificationKind } from '@prisma/client';
import { db } from '@/lib/db';
import { getPushEnv, hasPush } from '@/lib/env';
import { notificationBadgeUrl } from '@/lib/icons';
import type { DueNotification } from './schedule';
import type { NotificationContent } from './content';

/**
 * Entrega de avisos: regista em `NotificationLog` (idempotente pela unique) e envia por Web Push a todos
 * os dispositivos do utilizador. Sem push, o aviso fica só na caixa de avisos da app.
 */
export type DeliverResult = 'sent' | 'duplicate' | 'inbox-only';

const TTL_SECONDS = 4 * 60 * 60;
let configured = false;

function configure(): void {
  if (configured) return;
  const env = getPushEnv();
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
}

export interface PushPayload extends NotificationContent {
  tag: string;
}

/** Envia a todos os dispositivos do utilizador; apaga subscrições expiradas (404/410). Devolve quantos receberam. */
export async function pushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!hasPush()) return 0;
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return 0;
  configure();

  const body = JSON.stringify({ ...payload, icon: '/icons/icon-192.png', badge: notificationBadgeUrl() });
  const results = await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: TTL_SECONDS,
        });
        return true;
      } catch (err) {
        const status = err instanceof WebPushError ? err.statusCode : undefined;
        if (status === 404 || status === 410) {
          await db.pushSubscription.deleteMany({ where: { id: s.id } });
        } else {
          console.warn(`[push] Falha a enviar para ${new URL(s.endpoint).host}:`, status ?? (err instanceof Error ? err.message : err));
        }
        return false;
      }
    }),
  );
  return results.filter(Boolean).length;
}

export async function deliver(
  userId: string,
  n: DueNotification & NotificationContent,
): Promise<DeliverResult> {
  let logId: string;
  try {
    const log = await db.notificationLog.create({
      data: { userId, kind: n.kind as NotificationKind, periodKey: n.periodKey, title: n.title, body: n.body, url: n.url },
      select: { id: true },
    });
    logId = log.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return 'duplicate';
    throw err;
  }

  const ok = await pushToUser(userId, { title: n.title, body: n.body, url: n.url, tag: n.kind });
  if (ok === 0) return 'inbox-only';
  await db.notificationLog.update({ where: { id: logId }, data: { pushed: true } });
  return 'sent';
}
