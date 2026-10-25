import { inngest, type GuideGenerateEvent } from '../client';
import { db } from '@/lib/db';
import { getEntitlements } from '@/lib/entitlements/server';
import { dueGuideJobs } from '@/lib/guide/schedule';
import { reportJobFailure } from '../sentry';

/**
 * F14, de hora a hora: para quem activou o Guia e tem acesso, pede a leitura da semana (domingo de
 * madrugada) e do mês (dia 1) no fuso de cada pessoa. A geração volta a verificar tudo.
 */
export const guideDispatch = inngest.createFunction(
  { id: 'guide-dispatch', onFailure: reportJobFailure('guide-dispatch') },
  { cron: '0 * * * *' },
  async ({ step }) => {
    const nowIso = await step.run('now', () => new Date().toISOString());
    const now = new Date(nowIso);
    const events: GuideGenerateEvent[] = await step.run('select', async () => {
      const users = await db.user.findMany({ where: { guideConsentAt: { not: null } }, select: { id: true, timezone: true } });
      const out: GuideGenerateEvent[] = [];
      for (const u of users) {
        const jobs = dueGuideJobs(now, u.timezone);
        if (!jobs.length || !(await getEntitlements(u.id)).features.guide) continue;
        for (const j of jobs) out.push({ name: 'guide/generate', data: { userId: u.id, ...j, regenerate: false } });
      }
      return out;
    });
    if (events.length) await step.sendEvent('send', events);
    return { events: events.length };
  },
);
