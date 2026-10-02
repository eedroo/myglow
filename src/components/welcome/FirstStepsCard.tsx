import Link from 'next/link';
import { cookies } from 'next/headers';
import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { toDbDate, type DateISO } from '@/lib/dates';
import { weekStartOf } from '@/lib/weeks';
import { computeFirstSteps } from '@/lib/onboarding/firstSteps';
import { PROMPT_DISMISS_COOKIE } from '@/lib/notifications/prompt';
import { dismissFirstSteps } from '@/actions/welcome';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

/** Topo do /today: "Os teus primeiros passos", calculados a partir dos dados reais. Some quando tudo está feito ou dispensado. */
export async function FirstStepsCard({ userId, today }: { userId: string; today: DateISO }) {
  const weekStart = toDbDate(weekStartOf(today));
  const [user, entry, lessons, week, weekProjects, devices] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { firstStepsDismissedAt: true, welcomeSeenAt: true } }),
    db.dailyEntry.findUnique({ where: { userId_date: { userId, date: toDbDate(today) } }, select: { intention: true } }),
    db.lessonProgress.count({ where: { userId } }),
    db.week.findUnique({ where: { userId_startDate: { userId, startDate: weekStart } }, select: { intention: true } }),
    db.projectIntention.count({ where: { userId, period: 'WEEK', periodStart: weekStart } }),
    db.pushSubscription.count({ where: { userId } }),
  ]);
  if (!user || user.firstStepsDismissedAt) return null;

  const { steps, allDone } = computeFirstSteps({
    hasIntentionToday: !!entry?.intention?.trim(),
    lessonsCompleted: lessons,
    hasWeekIntention: !!week?.intention?.trim() || weekProjects > 0,
    hasPushOrDismissed: devices > 0 || cookies().has(PROMPT_DISMISS_COOKIE),
  });
  if (allDone) return null;

  const t = await getTranslations('firstSteps');
  return (
    <GlassCard className="mg-first-steps" variant="accent" title={t('title')}>
      <ol className="mg-first-steps__list">
        {steps.map((s) => (
          <li key={s.key} className={s.done ? 'mg-first-steps__step mg-first-steps__step--done' : 'mg-first-steps__step'}>
            <span className="mg-first-steps__check" aria-hidden="true">
              {s.done && <Check size={14} strokeWidth={2.5} />}
            </span>
            {s.done ? (
              <span>
                {t(`steps.${s.key}`)}
                <span className="mg-visually-hidden"> · {t('done')}</span>
              </span>
            ) : (
              <Link href={s.href} className="mg-first-steps__link">
                {t(`steps.${s.key}`)}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <div className="mg-first-steps__footer">
        <Link href="/welcome" className="mg-btn mg-btn--subtle">
          {user.welcomeSeenAt ? t('reviewTour') : t('seeTour')}
        </Link>
        <form action={dismissFirstSteps}>
          <Button type="submit" variant="subtle">
            {t('dismiss')}
          </Button>
        </form>
      </div>
    </GlassCard>
  );
}
