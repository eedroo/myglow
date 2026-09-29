import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';
import { levelFor } from '@/lib/xp/levels';

const R = 19;
const C = 2 * Math.PI * R;

/** Ícone do nível num anel de progresso; liga à jornada (/profile). */
export async function LevelBadge({ total }: { total: number }) {
  const t = await getTranslations('glow');
  const info = levelFor(total);
  const label = t('badge', { level: info.level, name: t(`levels.${info.key}.name`), total });

  return (
    <Link href="/profile" className="mg-level-badge" aria-label={label} title={label}>
      <svg className="mg-level-badge__ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle className="mg-level-badge__track" cx="22" cy="22" r={R} />
        {info.progress > 0 && (
          <circle
            className="mg-level-badge__arc"
            cx="22"
            cy="22"
            r={R}
            strokeDasharray={`${C * info.progress} ${C}`}
          />
        )}
      </svg>
      <span className="mg-level-badge__icon">
        <MagicIcon name={`level-${info.level}` as MagicIconName} size="sm" decorative />
      </span>
    </Link>
  );
}
