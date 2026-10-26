import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { bodyPage } from '@/lib/fitness/page';
import { hasGuideConsent } from '@/lib/guide/consent';
import { getMuscleData, getWeightData } from '@/lib/body/queries';
import { WellbeingConsentCard } from '@/components/account/WellbeingConsentCard';
import { BodyHeader } from '@/components/body/BodyHeader';
import { BodyWeightCard } from '@/components/body/BodyWeightCard';
import { BodyGuideCard } from '@/components/body/BodyGuideCard';
import { MuscleMap } from '@/components/body/MuscleMap';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('body');
  return { title: t('title') };
}

/** Tab Corpo: peso (com consentimento de bem-estar), mapa muscular e o convite do Guia. */
export default async function BodyRoute() {
  const { userId, locale } = await bodyPage();
  const [t, user, muscles] = await Promise.all([
    getTranslations('body'),
    db.user.findUnique({ where: { id: userId }, select: { wellbeingConsentAt: true, guideConsentAt: true, guideConsentVersion: true, guideIncludeBody: true } }),
    getMuscleData(userId, locale),
  ]);
  const consent = !!user?.wellbeingConsentAt;
  const weight = consent ? await getWeightData(userId) : null;
  const guideReady = !!user && hasGuideConsent(user) && consent;
  return (
    <>
      <BodyHeader title={t('title')} />
      <div className="mg-body-shell__main">
        {weight ? <BodyWeightCard data={weight} /> : <WellbeingConsentCard consentedOn={null} />}
        <h2 className="mg-body-section-title">{t('map.title')}</h2>
        <MuscleMap recovery={muscles.recovery} recent={muscles.recent} />
        {muscles.unassigned.length > 0 && (
          <p className="mg-muscle-map__warn">
            {t('map.unassigned', { n: muscles.unassigned.length })}{' '}
            <Link href="/body/exercises?tab=mine">{t('map.unassignedLink')}</Link>
          </p>
        )}
        {guideReady && <BodyGuideCard enabled={user!.guideIncludeBody} />}
      </div>
    </>
  );
}
