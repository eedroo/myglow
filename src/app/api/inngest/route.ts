import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { userDispatch } from '@/inngest/functions/userDispatch';
import { generateSign } from '@/inngest/functions/generateSign';
import { generateUser } from '@/inngest/functions/generateUser';
import { notificationsDispatch } from '@/inngest/functions/notificationsDispatch';
import { guideDispatch } from '@/inngest/functions/guideDispatch';
import { guideGenerate } from '@/inngest/functions/guideGenerate';
import { friendRequestsExpire } from '@/inngest/functions/friendRequestsExpire';
import { fitnessRestAlert } from '@/inngest/functions/fitnessRestAlert';
import { announcementFanout } from '@/inngest/functions/announcementFanout';

/** Endpoint do Inngest (assinado com INNGEST_SIGNING_KEY em produção). */
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  // O horóscopo diário e a energia semanal por signo deixaram de ser gerados (só o mês tem leitura por signo).
  functions: [userDispatch, generateSign, generateUser, notificationsDispatch, guideDispatch, guideGenerate, friendRequestsExpire, fitnessRestAlert, announcementFanout],
});
