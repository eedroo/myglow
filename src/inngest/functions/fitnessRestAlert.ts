import { inngest } from '../client';
import { db } from '@/lib/db';
import { getEntitlements } from '@/lib/entitlements/server';
import { buildNotification } from '@/lib/notifications/content';
import { pushToUser } from '@/lib/notifications/send';
import { exerciseName, type ExerciseNames } from '@/lib/fitness/library';
import { shouldSendRestPush } from '@/lib/fitness/restAlert';
import { todayInTz } from '@/lib/dates';
import { dbToAppLocale } from '@/i18n/locales';
import { reportJobFailure } from '../sentry';

/**
 * F16: aviso de fim de descanso. Dorme até `restEndsAt`, relê a sessão e só envia o push se o descanso é o
 * mesmo, a sessão continua activa e a app está em segundo plano. Só push (tag 'rest', 60 s), sem caixa de avisos.
 */
export const fitnessRestAlert = inngest.createFunction(
  { id: 'fitness-rest-alert', onFailure: reportJobFailure('fitness-rest-alert'), retries: 1 },
  { event: 'fitness/rest.started' },
  async ({ event, step }) => {
    const { userId, sessionId, restEndsAt } = event.data;
    await step.sleepUntil('rest', new Date(restEndsAt));
    return step.run('notify', async () => {
      const session = await db.fitnessSession.findFirst({
        where: { id: sessionId, userId },
        select: { restEndsAt: true, endedAt: true, clientHidden: true, restExerciseId: true },
      });
      if (!shouldSendRestPush(session, restEndsAt)) return 'skipped';
      if (!(await getEntitlements(userId)).features['body-pro']) return 'skipped';
      const [user, prefs, exercise] = await Promise.all([
        db.user.findUnique({ where: { id: userId }, select: { locale: true, timezone: true } }),
        db.fitnessPrefs.findUnique({ where: { userId }, select: { restAlert: true } }),
        session!.restExerciseId ? db.exercise.findUnique({ where: { id: session!.restExerciseId }, select: { names: true } }) : null,
      ]);
      if (!user || prefs?.restAlert === false) return 'skipped';
      const content = buildNotification('REST_DONE', {
        locale: user.locale,
        date: todayInTz(user.timezone),
        tz: user.timezone,
        exerciseName: exercise ? exerciseName(exercise.names as ExerciseNames, dbToAppLocale(user.locale)) : undefined,
      });
      const sent = await pushToUser(userId, { ...content, tag: 'rest' }, { ttl: 60 });
      return sent > 0 ? 'sent' : 'no-device';
    });
  },
);
