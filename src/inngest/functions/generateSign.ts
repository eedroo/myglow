import { inngest } from '../client';
import { generateSignContent } from '@/lib/ai/generate';

/** Gera um conteúdo partilhado (signo × período × língua). */
export const generateSign = inngest.createFunction(
  {
    id: 'generate-sign',
    idempotency: 'event.data.kind + ":" + event.data.periodStart + ":" + event.data.sign + ":" + event.data.locale',
    concurrency: { limit: 5 },
    throttle: { limit: 60, period: '1m' },
    retries: 3,
  },
  { event: 'ai/sign.generate' },
  async ({ event, step }) => {
    const { kind, periodStart, sign, locale } = event.data;
    return step.run('generate', () => generateSignContent(kind, periodStart, sign, locale));
  },
);
