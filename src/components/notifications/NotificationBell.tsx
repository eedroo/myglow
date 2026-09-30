import { getInbox, getUnreadCount } from '@/lib/notifications/queries';
import { NotificationInbox } from './NotificationInbox';

/** Sino da TopBar: avisos recentes e contagem de não lidos (a caixa funciona mesmo sem push). */
export async function NotificationBell({ userId }: { userId: string }) {
  const [items, unread] = await Promise.all([getInbox(userId, 30), getUnreadCount(userId)]);
  return <NotificationInbox items={items} unread={unread} />;
}
