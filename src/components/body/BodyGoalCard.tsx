import { getLocale, getTranslations } from 'next-intl/server';
import { formatDeltaKg, formatGramsAsKg } from '@/lib/weight';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import type { WeightPageData } from '@/lib/body/queries';

/** Objectivo e estado desta semana, em linguagem neutra (descreve, não julga). */
export async function BodyGoalCard({ goal, status }: { goal: NonNullable<WeightPageData['goal']>; status: NonNullable<WeightPageData['status']> }) {
  const [t, raw] = await Promise.all([getTranslations('body.goal'), getLocale()]);
  const loc = intlLocale(isAppLocale(raw) ? raw : 'pt-PT');
  const rate = formatGramsAsKg(goal.weeklyRateGrams, loc);
  return (
    <section className="mg-body-card mg-goal-card" aria-label={t('title')}>
      <p className="mg-goal-card__line">
        <strong>{goal.direction === 'MAINTAIN' ? t('summaryMaintain') : t(goal.direction === 'GAIN' ? 'summaryGain' : 'summaryLose', { kg: rate })}</strong>
      </p>
      <p className="mg-goal-card__line">
        {status.weeklyDeltaGrams != null
          ? t('thisWeek', { delta: formatDeltaKg(status.weeklyDeltaGrams, loc), status: t(`status.${status.status}`) })
          : t('status.not-enough-data')}
      </p>
      {status.toTargetGrams != null && goal.targetGrams != null && (
        <p className="mg-goal-card__line">
          {status.weeksToTarget != null && status.weeksToTarget > 0
            ? t('toTargetWeeks', { kg: formatGramsAsKg(Math.abs(status.toTargetGrams), loc), weeks: status.weeksToTarget })
            : t('toTarget', { kg: formatGramsAsKg(Math.abs(status.toTargetGrams), loc) })}
        </p>
      )}
    </section>
  );
}
