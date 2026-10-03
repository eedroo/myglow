import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { signMonthly } from '@/inngest/functions/signMonthly';
import { userDispatch } from '@/inngest/functions/userDispatch';
import { generateSign } from '@/inngest/functions/generateSign';
import { generateUser } from '@/inngest/functions/generateUser';
import { notificationsDispatch } from '@/inngest/functions/notificationsDispatch';

/** Endpoint do Inngest (assinado com INNGEST_SIGNING_KEY em produção). */
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  // O horóscopo diário e a energia semanal por signo deixaram de ser gerados (só o mês tem leitura por signo).
  functions: [signMonthly, userDispatch, generateSign, generateUser, notificationsDispatch],
});
