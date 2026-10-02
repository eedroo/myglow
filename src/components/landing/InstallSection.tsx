import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { InstallButton } from '@/components/notifications/InstallButton';

export function InstallSection() {
  const t = useTranslations('landing.install');
  return (
    <section className="mg-landing__section" aria-labelledby="landing-install-title">
      <div className="mg-landing__inner mg-landing__inner--center">
        <MagicIcon name="moon-stars" size="xl" decorative />
        <h2 id="landing-install-title" className="mg-landing__title">
          {t('title')}
        </h2>
        <p className="mg-landing__lead">{t('text')}</p>
        <InstallButton />
        <p className="mg-landing__note">{t('iphone')}</p>
      </div>
    </section>
  );
}
