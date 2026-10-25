import type { OrbSigns } from '@/lib/friends/orb';
import { LightOrb } from './LightOrb';

const R = 19;
const C = 2 * Math.PI * R;

interface FriendAvatarProps {
  idKey: string;
  orb: OrbSigns | null;
  initials: string;
  progress: number; // 0–1 dentro do nível
  size?: 'sm' | 'md' | 'lg';
}

/** Esfera de luz dentro do anel de nível; as iniciais aparecem só na esfera neutra. */
export function FriendAvatar({ idKey, orb, initials, progress, size = 'md' }: FriendAvatarProps) {
  return (
    <span className={`mg-friend-avatar mg-friend-avatar--${size}`} aria-hidden="true">
      <svg className="mg-friend-avatar__ring" viewBox="0 0 44 44">
        <circle className="mg-friend-avatar__track" cx="22" cy="22" r={R} />
        {progress > 0 && <circle className="mg-friend-avatar__arc" cx="22" cy="22" r={R} strokeDasharray={`${C * progress} ${C}`} />}
      </svg>
      <LightOrb signs={orb} idKey={`${idKey}-${size}`} className="mg-friend-avatar__orb" />
      {!orb && <span className="mg-friend-avatar__initials">{initials}</span>}
    </span>
  );
}
