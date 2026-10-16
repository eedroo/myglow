import { inngest } from '../client';
import { aiRequestsPerMinute } from '@/lib/env';
import { db, isUserGoneError } from '@/lib/db';
import { todayInTz } from '@/lib/dates';
import { generateUserContent } from '@/lib/ai/generate';
import { buildNotification } from '@/lib/notifications/content';
import { notificationContext } from '@/lib/notifications/queries';
import { deliver } from '@/lib/notifications/send';

const ACTIVE_DAYS = 30;

/**
 * Reenvio pontual da mensagem do dia (disparo manual no painel do Inngest: evento `admin/morning.resend`).
 * Quem recebe: contas activas nos últimos 30 dias com o lembrete da manhã ligado. `dryRun: true` só conta.
 * Cada pessoa é tratada em `morning-resend-user`, com o mesmo ritmo da geração IA normal.
 */
export const morningResend = inngest.createFunction(
  { id: 'morning-resend', concurrency: { limit: 1 } },
  { event: 'admin/morning.resend' },
  async ({ event, step }) => {
    const since = new Date(Date.now() - ACTIVE_DAYS * 86_400_000);
    const users = await step.run('eligible', () =>
      db.user.findMany({
        where: {
          onboardedAt: { not: null },
          lastActiveAt: { gte: since },
          notificationPrefs: { is: { enabled: true, morningEnabled: true } },
        },
        select: { id: true },
      }),
    );
    if (event.data.dryRun || !users.length) return { eligible: users.length, sent: false };
    await step.sendEvent(
      'fan-out',
      users.map((u) => ({ name: 'admin/morning.resend.user' as const, data: { userId: u.id, batch: event.id ?? 'manual' } })),
    );
    return { eligible: users.length, sent: true };
  },
);

/** Uma pessoa: refaz a leitura de hoje (regras v6) e envia o aviso da manhã com o novo texto. */
export const morningResendUser = inngest.createFunction(
  {
    id: 'morning-resend-user',
    idempotency: 'event.data.userId + ":" + event.data.batch',
    concurrency: { limit: 5 },
    throttle: { limit: aiRequestsPerMinute(), period: '1m' },
    retries: 2,
  },
  { event: 'admin/morning.resend.user' },
  async ({ event, step }) => {
    const { userId } = event.data;
    try {
      const user = await step.run('user', () =>
        db.user.findUnique({ where: { id: userId }, select: { timezone: true, locale: true, hemisphere: true } }),
      );
      if (!user) return 'unavailable';
      const date = todayInTz(user.timezone);
      const outcome = await step.run('generate', () => generateUserContent(userId, 'DAY_PERSONAL', date));
      // Sem mapa natal ou geração falhada: não há mensagem nova para mandar.
      if (outcome === 'unavailable' || outcome === 'invalid') return outcome;
      return await step.run('deliver', async () => {
        const ctx = await notificationContext(userId, { locale: user.locale, date, tz: user.timezone, hemisphere: user.hemisphere });
        if (!ctx.dayHeadline) return 'no-reading';
        // periodKey próprio: não colide com o aviso normal do dia (a unique só deixa reenviar uma vez).
        return deliver(userId, { kind: 'MORNING', periodKey: `${date}#resend`, ...buildNotification('MORNING', ctx) });
      });
    } catch (err) {
      if (isUserGoneError(err)) return 'unavailable';
      throw err;
    }
  },
);
