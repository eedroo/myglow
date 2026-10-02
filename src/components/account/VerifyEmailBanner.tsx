import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { VERIFY_BANNER_COOKIE } from '@/lib/account/banner';
import { BannerDismiss } from './BannerDismiss';
import { ResendVerificationButton } from './ResendVerificationButton';

/** Topo da app enquanto o email não está confirmado (fechar esconde 3 dias). Não bloqueia o uso. */
export async function VerifyEmailBanner({ verified }: { verified: boolean }) {
  if (verified || cookies().has(VERIFY_BANNER_COOKIE)) return null;
  const t = await getTranslations('account.banner');
  return (
    <div className="mg-banner mg-banner--info" role="region" aria-label={t('label')}>
      <span className="mg-banner__icon">
        <MagicIcon name="sparkles" size="sm" decorative />
      </span>
      <p className="mg-banner__text">{t('text')}</p>
      <div className="mg-banner__actions">
        <ResendVerificationButton />
        <BannerDismiss label={t('dismiss')} />
      </div>
    </div>
  );
}
