import 'server-only';
import { db } from '@/lib/db';
import { todayInTz } from '@/lib/dates';
import { buildNotification } from '@/lib/notifications/content';
import { deliver } from '@/lib/notifications/send';
import { firstName } from './rules';

/**
 * Avisos de amigos (F15): a caixa de avisos recebe sempre; o push só com `enabled && friends`.
 * `periodKey` = id do pedido + instante do envio (um pedido reenviado depois de recusado volta a avisar).
 * Nunca falha a acção que o disparou.
 */
export async function notifyFriend(
  kind: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED',
  toUserId: string,
  fromName: string,
  request: { id: string; createdAt: Date },
): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: toUserId },
      select: { locale: true, timezone: true, notificationPrefs: { select: { enabled: true, friends: true } } },
    });
    if (!user) return;
    const content = buildNotification(kind, {
      locale: user.locale,
      date: todayInTz(user.timezone),
      tz: user.timezone,
      friendName: firstName(fromName),
    });
    const push = !!user.notificationPrefs?.enabled && !!user.notificationPrefs.friends;
    await deliver(toUserId, { kind, periodKey: `${request.id}:${request.createdAt.getTime()}`, ...content }, { push });
  } catch (err) {
    console.warn('[friends] Falha ao avisar:', err instanceof Error ? err.message : err);
  }
}
