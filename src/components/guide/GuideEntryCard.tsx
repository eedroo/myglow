import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { getGuideEntryStatus } from '@/lib/guide/queries';
import type { RecapPeriod } from '@/lib/recap/period';

/** Cartão compacto do Guia (só para quem tem acesso: a página que o usa já verificou). */
export async function GuideEntryCard({ userId, period }: { userId: string; period: RecapPeriod }) {
  const [t, status] = await Promise.all([getTranslations('guide'), getGuideEntryStatus(userId, period.kind, period.key)]);
  const name = t('name');
  const href = `/guide/${period.kind === 'WEEK' ? 'week' : 'month'}/${period.key}`;
  return (
    <Link href={href} className="mg-guide-entry">
      <span className="mg-guide-entry__icon">
        <MagicIcon name="crystal-ball" size="md" decorative />
      </span>
      <span className="mg-guide-entry__text">
        <span className="mg-guide-entry__title">{t(period.kind === 'WEEK' ? 'entry.titleWeek' : 'entry.titleMonth', { name })}</span>
        <span className="mg-guide-entry__status">{t(`entry.${status}`, { name })}</span>
      </span>
    </Link>
  );
}
