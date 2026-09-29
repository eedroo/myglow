import { inngest, userEvents, type UserGenerateEvent } from '../client';
import { db } from '@/lib/db';
import { dueUserJobs } from '@/lib/ai/schedule';

const BATCH = 500;
const ACTIVE_DAYS = 7;

/**
 * De hora a hora: para utilizadores onboarded e activos nos últimos 7 dias, envia os trabalhos devidos
 * na sua hora local (03:xx). Os restantes só recebem conteúdo a pedido.
 */
export const userDispatch = inngest.createFunction(
  { id: 'user-dispatch' },
  { cron: '0 * * * *' },
  async ({ step }) => {
    const nowIso = await step.run('now', () => new Date().toISOString());
    const now = new Date(nowIso);
    const since = new Date(now.getTime() - ACTIVE_DAYS * 86_400_000);
    let cursor: string | null = null;
    let total = 0;

    for (let n = 0; ; n++) {
      const batch: { events: UserGenerateEvent[]; last: string | null } = await step.run(`batch-${n}`, async () => {
        const users = await db.user.findMany({
          where: { onboardedAt: { not: null }, lastActiveAt: { gte: since } },
          select: { id: true, timezone: true, locale: true },
          orderBy: { id: 'asc' },
          take: BATCH,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        });
        return {
          events: users.flatMap((u) => userEvents(u.id, u.locale, dueUserJobs(now, u.timezone))),
          last: users.length === BATCH ? users[users.length - 1]!.id : null,
        };
      });
      if (batch.events.length) await step.sendEvent(`send-${n}`, batch.events);
      total += batch.events.length;
      if (!batch.last) break;
      cursor = batch.last;
    }
    return { events: total };
  },
);
