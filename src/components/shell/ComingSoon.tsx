import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconBadge } from '@/components/ui/IconBadge';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';

/** Cartão "Em breve" das páginas placeholder da Fase 1. */
export async function ComingSoon({ icon }: { icon: MagicIconName }) {
  const t = await getTranslations('common');
  return (
    <GlassCard
      title={t('comingSoon')}
      header={
        <IconBadge size="md">
          <MagicIcon name={icon} size="md" decorative />
        </IconBadge>
      }
    >
      <p>{t('comingSoonBody')}</p>
    </GlassCard>
  );
}
