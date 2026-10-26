import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { bodyPage } from '@/lib/fitness/page';
import { getFitnessPrefs } from '@/lib/fitness/queries';
import { FITNESS_TEMPLATES } from '@/lib/fitness/templates';
import { BodyHeader } from '@/components/body/BodyHeader';
import { BodyWelcome } from '@/components/body/BodyWelcome';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('fitness');
  return { title: t('title') };
}

export default async function BodyWelcomeRoute() {
  const { userId } = await bodyPage();
  const [t, prefs] = await Promise.all([getTranslations('fitness'), getFitnessPrefs(userId)]);
  return (
    <>
      <BodyHeader title={t('title')} />
      <div className="mg-body-shell__main">
        <BodyWelcome
          initialRest={prefs.defaultRestSec}
          templates={FITNESS_TEMPLATES.map((tpl) => ({ id: tpl.id, name: t(`templates.${tpl.id}.name`), description: t(`templates.${tpl.id}.description`) }))}
        />
      </div>
    </>
  );
}
