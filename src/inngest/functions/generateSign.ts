import { inngest } from '../client';
import { aiRequestsPerMinute } from '@/lib/env';
import { generateSignContent } from '@/lib/ai/generate';

/** Gera um conteúdo partilhado (signo × período × língua). */
export const generateSign = inngest.createFunction(
  {
    id: 'generate-sign',
    idempotency: 'event.data.kind + ":" + event.data.periodStart + ":" + event.data.sign + ":" + event.data.locale',
    concurrency: { limit: 5 },
    throttle: { limit: aiRequestsPerMinute(), period: '1m' }, // partilhado com o limite do fornecedor de IA
    // (as duas funções têm throttle próprio: o limite efectivo pode chegar ao dobro; usar metade do plano)
    retries: 3,
  },
  { event: 'ai/sign.generate' },
  async ({ event, step }) => {
    const { kind, periodStart, sign, locale } = event.data;
    return step.run('generate', () => generateSignContent(kind, periodStart, sign, locale));
  },
);
