import { useTranslations } from 'next-intl';
import { Motto } from '@/components/ui/Motto';
import { RegisterCta } from './RegisterCta';

export function FinalCta() {
  const t = useTranslations();
  return (
    <section className="mg-landing__section" aria-labelledby="landing-cta-title">
      <div className="mg-landing__inner mg-landing__cta">
        <h2 id="landing-cta-title" className="mg-landing__title">
          {t('landing.cta.title')}
        </h2>
        <RegisterCta className="mg-btn mg-btn--primary">
          {t('landing.hero.cta')}
        </RegisterCta>
        <Motto text={t('common.motto')} />
      </div>
    </section>
  );
}
