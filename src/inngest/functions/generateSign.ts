import { inngest } from '../client';
import { aiRequestsPerMinute } from '@/lib/env';
import { generateSignContent } from '@/lib/ai/generate';

/** Gera um conteúdo partilhado (signo × período × língua). */
export const generateSign = inngest.createFunction(
  {
    id: 'generate-sign',
    // Uma geração por conteúdo a cada 10 min (antes: idempotência de 24 h, que deixava o ecrã "a preparar" um dia
    // inteiro quando a geração falhava). Pedidos repetidos são baratos: o que já existe não volta à IA.
    rateLimit: { key: 'event.data.kind + ":" + event.data.periodStart + ":" + event.data.sign + ":" + event.data.locale + ":v" + string(event.data.version)', limit: 1, period: '10m' },
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
