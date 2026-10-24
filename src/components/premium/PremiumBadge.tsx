import { getTranslations } from 'next-intl/server';

/** Pílula dourada "Premium" (perfil, ao lado do nível, só para quem é premium). */
export async function PremiumBadge() {
  const t = await getTranslations('premium');
  return <span className="mg-premium-badge">{t('badge')}</span>;
}
