import Link from 'next/link';
import type { ReactNode } from 'react';
import { MagicIcon } from '@/components/ui/MagicIcon';

interface TopBarProps {
  appName: string;
  userName: string;
  settingsLabel: string;
  homeLabel: string;
  /** Badge do nível (Glow), à esquerda do avatar. */
  badge?: ReactNode;
}

/** Logo MYGLOW + avatar com link para definições. */
export function TopBar({ appName, userName, settingsLabel, homeLabel, badge }: TopBarProps) {
  const initial = userName.trim().charAt(0).toUpperCase() || '·';
  return (
    <header className="mg-topbar">
      <Link href="/today" className="mg-topbar__logo" aria-label={homeLabel}>
        <MagicIcon name="moon-crescent" size="sm" decorative />
        <span className="mg-topbar__wordmark" aria-hidden="true">
          {appName}
        </span>
      </Link>
      <div className="mg-topbar__actions">
        {badge}
        <Link href="/settings" className="mg-topbar__settings" aria-label={settingsLabel} title={settingsLabel}>
          <span aria-hidden="true">{initial}</span>
        </Link>
      </div>
    </header>
  );
}
