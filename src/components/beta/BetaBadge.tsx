import { useTranslations } from 'next-intl';
import { isBeta } from '@/lib/env';

/** Pílula "beta" ao lado do logo. Só com `BETA=true`. */
export function BetaBadge() {
  const t = useTranslations('beta');
  if (!isBeta()) return null;
  return (
    <span className="mg-beta-badge" title={t('badgeTitle')}>
      {t('badge')}
    </span>
  );
}
