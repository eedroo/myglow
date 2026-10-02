import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Motto } from '@/components/ui/Motto';

export function FinalCta() {
  const t = useTranslations();
  return (
    <section className="mg-landing__section" aria-labelledby="landing-cta-title">
      <div className="mg-landing__inner mg-landing__cta">
        <h2 id="landing-cta-title" className="mg-landing__title">
          {t('landing.cta.title')}
        </h2>
        <Link href="/register" className="mg-btn mg-btn--primary">
          {t('landing.hero.cta')}
        </Link>
        <Motto text={t('common.motto')} />
      </div>
    </section>
  );
}
