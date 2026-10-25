import { inngest } from '../client';
import { aiRequestsPerMinute } from '@/lib/env';
import { generateGuideReport } from '@/lib/guide/generate';
import { isUserGoneError } from '@/lib/db';
import { reportJobFailure } from '../sentry';

/** F14: gera uma leitura do Guia (os portões repetem-se aqui: acesso, consentimento, período acabado). */
export const guideGenerate = inngest.createFunction(
  {
    id: 'guide-generate',
    onFailure: reportJobFailure('guide-generate'),
    idempotency: '"guide:" + event.data.userId + ":" + event.data.kind + ":" + event.data.periodKey + ":" + string(event.data.regenerate)',
    concurrency: { limit: 3 },
    throttle: { limit: aiRequestsPerMinute(), period: '1m' }, // o mesmo da Fase 6
    retries: 2,
  },
  { event: 'guide/generate' },
  async ({ event, step }) => {
    const { userId, kind, periodKey, regenerate } = event.data;
    return step.run('generate', () =>
      generateGuideReport(userId, kind, periodKey, { regenerate }).catch((err) => {
        if (isUserGoneError(err)) return 'skipped' as const;
        throw err;
      }),
    );
  },
);
