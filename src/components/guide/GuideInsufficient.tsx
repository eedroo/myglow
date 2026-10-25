import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { GuideRetry } from './GuideRetry';

/** Poucos dias escritos: sem chamada à IA; convite a escrever e a pedir de novo. */
export async function GuideInsufficient({ kind, periodKey }: { kind: 'WEEK' | 'MONTH'; periodKey: string }) {
  const t = await getTranslations('guide');
  return (
    <div className="mg-guide-empty" role="status">
      <p className="mg-guide-empty__text">{t('insufficient.text', { name: t('name') })}</p>
      <div className="mg-guide-consent__actions">
        <Link href="/today" className="mg-btn mg-btn--primary">
          {t('insufficient.cta')}
        </Link>
        <GuideRetry kind={kind} periodKey={periodKey} />
      </div>
    </div>
  );
}
