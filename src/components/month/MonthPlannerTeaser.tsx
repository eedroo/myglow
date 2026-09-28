import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconBadge } from '@/components/ui/IconBadge';
import { MagicIcon } from '@/components/ui/MagicIcon';

/** Anúncio do planner mensal (removido na Fase 4). */
export async function MonthPlannerTeaser() {
  const t = await getTranslations('month.teaser');
  return (
    <GlassCard
      variant="flat"
      title={t('title')}
      header={
        <IconBadge size="md">
          <MagicIcon name="scroll" size="md" decorative />
        </IconBadge>
      }
    >
      <p>{t('body')}</p>
    </GlassCard>
  );
}
