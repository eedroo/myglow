import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconBadge } from '@/components/ui/IconBadge';
import { MagicIcon } from '@/components/ui/MagicIcon';

/** "Rituais do mês · em breve" — substituído pelos rituais sugeridos na Fase 6. */
export async function RitualsTeaserCard() {
  const t = await getTranslations('month.rituals');
  return (
    <GlassCard
      variant="flat"
      title={t('title')}
      header={
        <IconBadge size="md">
          <MagicIcon name="candle" size="md" decorative />
        </IconBadge>
      }
    >
      <p>{t('body')}</p>
    </GlassCard>
  );
}
