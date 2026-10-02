import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { isBeta } from '@/lib/env';

/** Registo: nota discreta de que a app está em beta (por cima dos consentimentos). Só com `BETA=true`. */
export function BetaNotice() {
  const t = useTranslations('beta');
  if (!isBeta()) return null;
  return (
    <p className="mg-beta-notice">
      <span className="mg-beta-notice__icon">
        <MagicIcon name="sparkles" size="sm" decorative />
      </span>
      <span className="mg-beta-notice__text">{t('notice')}</span>
    </p>
  );
}
