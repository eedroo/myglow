import Link from 'next/link';
import { useTranslations } from 'next-intl';

/** No lugar de humor/sono/peso quando não há consentimento de bem-estar (sem estado: serve no servidor e no cliente). */
export function WellbeingNotice() {
  const t = useTranslations('account.wellbeingOff');
  return (
    <div className="mg-wellbeing-off" role="note">
      <p className="mg-wellbeing-off__text">{t('text')}</p>
      <Link href="/settings#privacy" className="mg-wellbeing-off__link">
        {t('link')}
      </Link>
    </div>
  );
}
