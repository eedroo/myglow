import { inngest } from '../client';
import { aiRequestsPerMinute } from '@/lib/env';
import { generateUserContent } from '@/lib/ai/generate';
import { isUserGoneError } from '@/lib/db';
import { reportJobFailure } from '../sentry';

/** Gera um conteúdo pessoal (a língua é a actual do utilizador; `locale` no evento só entra na chave). */
export const generateUser = inngest.createFunction(
  {
    id: 'generate-user',
    onFailure: reportJobFailure('generate-user'),
    // Uma geração por conteúdo a cada 10 min (antes: idempotência de 24 h, que deixava o ecrã "a preparar" um dia
    // inteiro quando a geração falhava). Pedidos repetidos são baratos: o que já existe não volta à IA.
    rateLimit: { key: 'event.data.kind + ":" + event.data.periodStart + ":" + event.data.userId + ":" + event.data.locale + ":v" + string(event.data.version)', limit: 1, period: '10m' },
    concurrency: { limit: 5 },
    throttle: { limit: aiRequestsPerMinute(), period: '1m' }, // partilhado com o limite do fornecedor de IA
    // (as duas funções têm throttle próprio: o limite efectivo pode chegar ao dobro; usar metade do plano)
    retries: 3,
  },
  { event: 'ai/user.generate' },
  async ({ event, step }) => {
    const { userId, kind, periodStart } = event.data;
    // Conta apagada entretanto: ignora em silêncio (sem retries).
    return step.run('generate', () =>
      generateUserContent(userId, kind, periodStart).catch((err) => {
        if (isUserGoneError(err)) return 'unavailable' as const;
        throw err;
      }),
    );
  },
);
