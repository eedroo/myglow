import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { BetaBadge } from '@/components/beta/BetaBadge';
import { LocaleSwitcher } from './LocaleSwitcher';
import { RegisterCta } from './RegisterCta';

export function LandingNav() {
  const t = useTranslations();
  return (
    <header className="mg-landing-nav">
      <Link href="/" className="mg-landing-nav__brand">
        <MagicIcon name="moon-crescent" size="sm" decorative />
        {t('common.appName')}
      </Link>
      <BetaBadge />
      <div className="mg-landing-nav__actions">
        <LocaleSwitcher />
        <Link href="/login" className="mg-btn mg-btn--ghost">
          {t('landing.nav.login')}
        </Link>
        <RegisterCta className="mg-btn mg-btn--primary">
          {t('landing.nav.register')}
        </RegisterCta>
      </div>
    </header>
  );
}
