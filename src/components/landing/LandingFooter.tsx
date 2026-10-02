import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from './LocaleSwitcher';

export function LandingFooter() {
  const t = useTranslations('landing.footer');
  return (
    <footer className="mg-landing-footer">
      <p>{t('made')}</p>
      <nav className="mg-landing-footer__links" aria-label={t('label')}>
        <Link href="/terms">{t('terms')}</Link>
        <Link href="/privacy">{t('privacy')}</Link>
        <a href={`mailto:${t('contact')}`}>{t('contact')}</a>
      </nav>
      <LocaleSwitcher />
    </footer>
  );
}
