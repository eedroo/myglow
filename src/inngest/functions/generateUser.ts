import { inngest } from '../client';
import { aiRequestsPerMinute } from '@/lib/env';
import { generateUserContent } from '@/lib/ai/generate';

/** Gera um conteúdo pessoal (a língua é a actual do utilizador; `locale` no evento só entra na chave). */
export const generateUser = inngest.createFunction(
  {
    id: 'generate-user',
    idempotency: 'event.data.kind + ":" + event.data.periodStart + ":" + event.data.userId + ":" + event.data.locale',
    concurrency: { limit: 5 },
    throttle: { limit: aiRequestsPerMinute(), period: '1m' }, // partilhado com o limite do fornecedor de IA
    // (as duas funções têm throttle próprio: o limite efectivo pode chegar ao dobro; usar metade do plano)
    retries: 3,
  },
  { event: 'ai/user.generate' },
  async ({ event, step }) => {
    const { userId, kind, periodStart } = event.data;
    return step.run('generate', () => generateUserContent(userId, kind, periodStart));
  },
);
