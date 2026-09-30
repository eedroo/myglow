import { getTranslations } from 'next-intl/server';
import { levelFor } from '@/lib/xp/levels';
import { ProfileAvatarLink } from './ProfileAvatarLink';

const R = 19;
const C = 2 * Math.PI * R;

/** Iniciais do nome (até 2). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0]!, parts[parts.length - 1]!] : parts.slice(0, 1);
  return letters.map((p) => p.charAt(0).toUpperCase()).join('') || '·';
}

/** Avatar (iniciais) dentro do anel de progresso do nível; abre o perfil (F8: substitui o Perfil da barra). */
export async function LevelBadge({ total, name }: { total: number; name: string }) {
  const [t, tn] = await Promise.all([getTranslations('glow'), getTranslations('nav')]);
  const info = levelFor(total);
  const label = `${tn('profile')} · ${t('badge', { level: info.level, name: t(`levels.${info.key}.name`), total })}`;

  return (
    <ProfileAvatarLink label={label}>
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
      <span className="mg-level-badge__initials" aria-hidden="true">
        {initials(name)}
      </span>
    </ProfileAvatarLink>
  );
}
