import { inngest } from '../client';
import { db } from '@/lib/db';
import { buildNotification } from '@/lib/notifications/content';
import { deliver } from '@/lib/notifications/send';
import { todayInTz } from '@/lib/dates';
import { FANOUT_BATCH } from '@/lib/journey/announcements';
import { reportJobFailure } from '../sentry';

/**
 * F19: anúncio publicado no admin → aviso na caixa a todos os utilizadores existentes (antes da publicação), com push
 * para quem tem os avisos ligados. Lotes de 100 com uma pausa entre eles; idempotente pelo NotificationLog
 * (`ANNOUNCEMENT` + key), por isso um reenvio ou uma repetição não duplica. Sem email.
 */
export const announcementFanout = inngest.createFunction(
  { id: 'announcement-fanout', onFailure: reportJobFailure('announcement-fanout'), retries: 2 },
  { event: 'announcement/fanout' },
  async ({ event, step }) => {
    const { key } = event.data;
    const announcement = await step.run('load', () => db.announcement.findUnique({ where: { key }, select: { publishedAt: true } }));
    if (!announcement) return { sent: 0 };
    const publishedAt = new Date(announcement.publishedAt);
    let cursor: string | null = null;
    let total = 0;
    for (let batch = 0; ; batch++) {
      const after: string | null = cursor;
      const r: { last: string | null; count: number } = await step.run(`batch-${batch}`, async () => {
        const users = await db.user.findMany({
          where: { createdAt: { lt: publishedAt }, ...(after && { id: { gt: after } }) },
          orderBy: { id: 'asc' },
          take: FANOUT_BATCH,
          select: { id: true, locale: true, timezone: true, notificationPrefs: { select: { enabled: true } } },
        });
        for (const u of users) {
          const content = buildNotification('ANNOUNCEMENT', { locale: u.locale, date: todayInTz(u.timezone), tz: u.timezone, announcement: key });
          await deliver(u.id, { kind: 'ANNOUNCEMENT', periodKey: key, ...content }, { push: !!u.notificationPrefs?.enabled }).catch((err) =>
            console.warn('[announcement] Falha a avisar:', err instanceof Error ? err.message : err),
          );
        }
        return { last: users.at(-1)?.id ?? null, count: users.length };
      });
      total += r.count;
      if (r.count < FANOUT_BATCH || !r.last) break;
      cursor = r.last;
      await step.sleep(`pause-${batch}`, '5s');
    }
    return { sent: total };
  },
);
