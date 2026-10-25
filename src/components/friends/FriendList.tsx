import { getTranslations } from 'next-intl/server';
import type { FriendSummary } from '@/lib/friends/queries';
import { GlassCard } from '@/components/ui/GlassCard';
import { LightOrb } from './LightOrb';
import { FriendRow } from './FriendRow';

export async function FriendList({ friends }: { friends: FriendSummary[] }) {
  const t = await getTranslations('friends');
  return (
    <GlassCard title={t('list.title', { n: friends.length })}>
      {friends.length === 0 ? (
        <div className="mg-friend-list__empty">
          <span className="mg-friend-avatar mg-friend-avatar--lg" aria-hidden="true">
            <LightOrb signs={null} idKey="empty" className="mg-friend-avatar__orb" />
          </span>
          <p>{t('list.empty')}</p>
        </div>
      ) : (
        <ul className="mg-friend-list">
          {friends.map((f) => (
            <li key={f.id}>
              <FriendRow friend={f} />
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
