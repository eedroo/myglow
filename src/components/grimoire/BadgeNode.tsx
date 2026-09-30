import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';

/** Emblema no fim da região: em silhueta até o curso estar concluído, depois dourado. */
export async function BadgeNode({ name, icon, earned }: { name: string; icon: MagicIconName; earned: boolean }) {
  const t = await getTranslations('grimoire.node');
  return (
    <span className="mg-node-wrap">
      <span
        className={earned ? 'mg-node mg-node--badge mg-node--earned' : 'mg-node mg-node--badge'}
        role="img"
        aria-label={`${t('badge', { name })} · ${earned ? t('completed') : t('locked')}`}
      >
        <MagicIcon name={icon} size="lg" decorative />
      </span>
      <span className="mg-node__label">{name}</span>
    </span>
  );
}
