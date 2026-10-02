import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account.goodbye');
  return { title: t('title') };
}

/** Depois de apagar a conta. */
export default async function GoodbyePage() {
  const t = await getTranslations('account.goodbye');
  return (
    <section className="mg-goodbye">
      <span className="mg-goodbye__icon">
        <MagicIcon name="moon-crescent" size="lg" decorative />
      </span>
      <h1 className="mg-goodbye__title">{t('title')}</h1>
      <p className="mg-goodbye__text">{t('text')}</p>
      <Link href="/" className="mg-btn mg-btn--ghost">
        {t('home')}
      </Link>
    </section>
  );
}
