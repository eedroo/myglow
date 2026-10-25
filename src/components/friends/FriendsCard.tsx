import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { listFriends, pendingCount } from '@/lib/friends/queries';
import { FriendAvatar } from './FriendAvatar';

/** Cartão "Amigos" no /profile: quantos, até 5 esferas sobrepostas e ponto dourado com pedidos por responder. */
export async function FriendsCard({ userId }: { userId: string }) {
  const [t, friends, pending] = await Promise.all([getTranslations('friends'), listFriends(userId), pendingCount(userId)]);
  return (
    <Link href="/friends" className="mg-friends-card">
      <span className="mg-friends-card__text">
        <span className="mg-friends-card__title">{t('title')}</span>
        <span className="mg-friends-card__meta">
          {pending > 0 ? t('card.pending', { n: pending }) : friends.length ? t('card.count', { n: friends.length }) : t('card.empty')}
        </span>
      </span>
      {friends.length > 0 && (
        <span className="mg-friends-card__avatars" aria-hidden="true">
          {friends.slice(0, 5).map((f) => (
            <FriendAvatar key={f.id} idKey={`card-${f.id}`} orb={f.orb} initials={f.initials} progress={f.progress} size="sm" />
          ))}
        </span>
      )}
      {pending > 0 && <span className="mg-friends-card__dot" aria-hidden="true" />}
    </Link>
  );
}
