import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AppPreview } from './AppPreview';

export function Hero() {
  const t = useTranslations('landing.hero');
  return (
    <section className="mg-landing-hero" aria-labelledby="landing-hero-title">
      <div className="mg-landing-hero__copy">
        <h1 id="landing-hero-title" className="mg-landing-hero__title">
          {t('title')}
        </h1>
        <p className="mg-landing-hero__lead">{t('lead')}</p>
        <div className="mg-landing-hero__actions">
          <Link href="/register" className="mg-btn mg-btn--primary">
            {t('cta')}
          </Link>
          <Link href="/login" className="mg-btn mg-btn--ghost">
            {t('login')}
          </Link>
        </div>
      </div>
      <AppPreview variant="today" />
    </section>
  );
}
