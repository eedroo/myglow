import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { getWeightData } from '@/lib/body/queries';
import { formatDeltaKg, formatGramsAsKg } from '@/lib/weight';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import { WellbeingConsentCard } from '@/components/account/WellbeingConsentCard';
import { BodyHeader } from '@/components/body/BodyHeader';
import { WeightChart } from '@/components/body/WeightChart';
import { WeightEntrySheet } from '@/components/body/WeightEntrySheet';
import { WeightList } from '@/components/body/WeightList';
import { BodyGoalCard } from '@/components/body/BodyGoalCard';
import { BodyGoalSheet } from '@/components/body/BodyGoalSheet';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('body.weight');
  return { title: t('title') };
}

/** Peso: média desta semana, gráfico M · 6M · A, objectivo, registos e lembrete. `?new=1` abre o registo. */
export default async function WeightRoute({ searchParams }: { searchParams: { new?: string } }) {
  const { userId } = await bodyPage();
  const [t, raw, user] = await Promise.all([
    getTranslations('body.weight'),
    getLocale(),
    db.user.findUnique({ where: { id: userId }, select: { wellbeingConsentAt: true } }),
  ]);
  if (!user?.wellbeingConsentAt) {
    return (
      <>
        <BodyHeader title={t('title')} backHref="/body/corpo" backLabel={t('back')} />
        <div className="mg-body-shell__main">
          <WellbeingConsentCard consentedOn={null} />
        </div>
      </>
    );
  }
  const loc = intlLocale(isAppLocale(raw) ? raw : 'pt-PT');
  const d = await getWeightData(userId);
  const kg = (g: number) => formatGramsAsKg(g, loc);
  return (
    <>
      <BodyHeader title={t('title')} backHref="/body/corpo" backLabel={t('back')} />
      <div className="mg-body-shell__main">
        <section className="mg-body-card mg-weight-card" aria-label={t('weekAverage')}>
          <span className="mg-weight-card__label">{t('weekAverage')}</span>
          <span className="mg-weight-card__value">{d.thisWeekAvg != null ? t('kg', { kg: kg(d.thisWeekAvg) }) : '–'}</span>
          {d.thisWeekAvg != null && d.lastWeekAvg != null && (
            <span className="mg-weight-card__delta">{t('vsLastWeek', { delta: formatDeltaKg(d.thisWeekAvg - d.lastWeekAvg, loc) })}</span>
          )}
          {d.thisWeekAvg != null && <span className="mg-weight-card__delta">{t('fromWeighIns', { n: d.thisWeekCount })}</span>}
        </section>
        <WeightChart points={d.points} today={d.today} targetGrams={d.goal?.targetGrams ?? null} />
        <div className="mg-body-sheet__actions">
          <WeightEntrySheet today={d.today} autoOpen={searchParams.new === '1'} lastKg={d.last ? kg(d.last.grams) : ''} />
          <BodyGoalSheet
            current={d.goal ? { direction: d.goal.direction, weeklyRateGrams: d.goal.weeklyRateGrams, targetKg: d.goal.targetGrams != null ? kg(d.goal.targetGrams) : '' } : null}
          />
        </div>
        {d.goal && d.status && <BodyGoalCard goal={d.goal} status={d.status} />}
        <h2 className="mg-body-section-title">{t('entries')}</h2>
        <WeightList points={d.points} />
      </div>
    </>
  );
}
