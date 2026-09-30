import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { signDaily } from '@/inngest/functions/signDaily';
import { signWeekly } from '@/inngest/functions/signWeekly';
import { signMonthly } from '@/inngest/functions/signMonthly';
import { userDispatch } from '@/inngest/functions/userDispatch';
import { generateSign } from '@/inngest/functions/generateSign';
import { generateUser } from '@/inngest/functions/generateUser';
import { notificationsDispatch } from '@/inngest/functions/notificationsDispatch';

/** Endpoint do Inngest (assinado com INNGEST_SIGNING_KEY em produção). */
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [signDaily, signWeekly, signMonthly, userDispatch, generateSign, generateUser, notificationsDispatch],
});
