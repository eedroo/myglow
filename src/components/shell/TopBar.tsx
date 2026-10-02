import Link from 'next/link';
import type { ReactNode } from 'react';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { BetaBadge } from '@/components/beta/BetaBadge';

interface TopBarProps {
  appName: string;
  homeLabel: string;
  /** Badge do nível (Glow), à esquerda do avatar. */
  badge?: ReactNode;
  /** Sino dos avisos (F7). */
  bell?: ReactNode;
}

/** Logo MYGLOW à esquerda; à direita o sino dos avisos e o avatar com anel de nível (abre o perfil). */
export function TopBar({ appName, homeLabel, badge, bell }: TopBarProps) {
  return (
    <header className="mg-topbar">
      <Link href="/today" className="mg-topbar__logo" aria-label={homeLabel}>
        <MagicIcon name="moon-crescent" size="sm" decorative />
        <span className="mg-topbar__wordmark" aria-hidden="true">
          {appName}
        </span>
      </Link>
      <BetaBadge />
      <div className="mg-topbar__actions">
        {bell}
        {badge}
      </div>
    </header>
  );
}
