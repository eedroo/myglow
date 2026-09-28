import Link from 'next/link';
import { MagicIcon } from '@/components/ui/MagicIcon';

interface TopBarProps {
  appName: string;
  userName: string;
  settingsLabel: string;
  homeLabel: string;
}

/** Logo MYGLOW + avatar com link para definições. */
export function TopBar({ appName, userName, settingsLabel, homeLabel }: TopBarProps) {
  const initial = userName.trim().charAt(0).toUpperCase() || '·';
  return (
    <header className="mg-topbar">
      <Link href="/today" className="mg-topbar__logo" aria-label={homeLabel}>
        <MagicIcon name="moon-crescent" size="sm" decorative />
        <span className="mg-topbar__wordmark" aria-hidden="true">
          {appName}
        </span>
      </Link>
      <Link href="/settings" className="mg-topbar__settings" aria-label={settingsLabel} title={settingsLabel}>
        <span aria-hidden="true">{initial}</span>
      </Link>
    </header>
  );
}
