import { inngest } from '../client';
import { db } from '@/lib/db';
import { dueCandidates, dueNotifications } from '@/lib/notifications/schedule';
import { buildNotification } from '@/lib/notifications/content';
import { notificationContext, notificationState } from '@/lib/notifications/queries';
import { deliver } from '@/lib/notifications/send';

const BATCH = 500;
const ACTIVE_DAYS = 30;

interface DueUser {
  id: string;
  tz: string;
  locale: 'PT_PT' | 'PT_BR' | 'EN';
  hemisphere: 'NORTH' | 'SOUTH';
  date: string; // dia local dos candidatos
}

/**
 * A cada 15 min: utilizadores onboarded, com lembretes activos e activos nos últimos 30 dias.
 * Primeiro só os horários (sem DB); depois, só para quem tem algo no slot, o estado e o envio.
 */
export const notificationsDispatch = inngest.createFunction(
  { id: 'notifications-dispatch', concurrency: { limit: 1 } },
  { cron: '*/15 * * * *' },
  async ({ step }) => {
    const nowIso = await step.run('now', () => new Date().toISOString());
    const now = new Date(nowIso);
    const since = new Date(now.getTime() - ACTIVE_DAYS * 86_400_000);
    const due: DueUser[] = [];
    let cursor: string | null = null;

    for (let n = 0; ; n++) {
      const batch: { users: DueUser[]; last: string | null } = await step.run(`batch-${n}`, async () => {
        const users = await db.user.findMany({
          where: { onboardedAt: { not: null }, lastActiveAt: { gte: since }, notificationPrefs: { is: { enabled: true } } },
          select: { id: true, timezone: true, locale: true, hemisphere: true, notificationPrefs: true },
          orderBy: { id: 'asc' },
          take: BATCH,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        });
        const withSlot = users.flatMap((u) => {
          const c = u.notificationPrefs ? dueCandidates(now, u.timezone, u.notificationPrefs) : [];
          return c.length ? [{ id: u.id, tz: u.timezone, locale: u.locale, hemisphere: u.hemisphere, date: c[0]!.date }] : [];
        });
        return { users: withSlot, last: users.length === BATCH ? users[users.length - 1]!.id : null };
      });
      due.push(...batch.users);
      if (!batch.last) break;
      cursor = batch.last;
    }

    let sent = 0;
    for (const u of due) {
      // Um erro num utilizador não pode travar os avisos dos restantes (nem repetir a ronda inteira).
      sent += await step.run(`user-${u.id}`, async () => {
        try {
          const prefs = await db.notificationPrefs.findUnique({ where: { userId: u.id } });
          if (!prefs) return 0;
          const state = await notificationState(u.id, u.date, u.locale);
          const todo = dueNotifications(now, u.tz, prefs, state);
          if (!todo.length) return 0;
          const ctx = await notificationContext(u.id, { locale: u.locale, date: u.date, tz: u.tz, hemisphere: u.hemisphere });
          let count = 0;
          for (const d of todo) {
            const res = await deliver(u.id, { ...d, ...buildNotification(d.kind, { ...ctx, periodKey: d.periodKey, grimoire: state.grimoire }) });
            if (res !== 'duplicate') count++;
          }
          return count;
        } catch (err) {
          console.error(`[notifications] Falha no utilizador ${u.id}:`, err instanceof Error ? err.message : err);
          return 0;
        }
      });
    }
    return { users: due.length, notifications: sent };
  },
);
