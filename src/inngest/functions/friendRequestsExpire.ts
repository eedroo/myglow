import { inngest } from '../client';
import { db } from '@/lib/db';
import { FRIENDS_LIMITS } from '@/lib/friends/rules';
import { reportJobFailure } from '../sentry';

/** F15, todos os dias: pedidos de amizade pendentes há mais de 30 dias passam a EXPIRED (a leitura já os ignora). */
export const friendRequestsExpire = inngest.createFunction(
  { id: 'friend-requests-expire', onFailure: reportJobFailure('friend-requests-expire') },
  { cron: '17 3 * * *' },
  async ({ step }) =>
    step.run('expire', async () => {
      const before = new Date(Date.now() - FRIENDS_LIMITS.requestTtlDays * 86_400_000);
      const { count } = await db.friendRequest.updateMany({
        where: { status: 'PENDING', createdAt: { lt: before } },
        data: { status: 'EXPIRED', respondedAt: new Date() },
      });
      return { expired: count };
    }),
);
