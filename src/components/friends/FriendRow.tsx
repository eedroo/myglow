import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { FriendSummary } from '@/lib/friends/queries';
import { FriendAvatar } from './FriendAvatar';

/** Uma linha da lista de amigos: esfera, nome, nível e sequência; abre o perfil. */
export async function FriendRow({ friend }: { friend: FriendSummary }) {
  const [t, tg] = await Promise.all([getTranslations('friends'), getTranslations('glow')]);
  return (
    <Link href={`/friends/${friend.id}`} className="mg-friend-row">
      <FriendAvatar idKey={friend.id} orb={friend.orb} initials={friend.initials} progress={friend.progress} />
      <span className="mg-friend-row__text">
        <span className="mg-friend-row__name">{friend.name}</span>
        <span className="mg-friend-row__meta">{t('levelLine', { level: friend.level, name: tg(`levels.${friend.levelKey}.name`) })}</span>
      </span>
      {friend.magicStreak > 0 && (
        <span className="mg-friend-row__streak" aria-label={t('streakLabel', { n: friend.magicStreak })}>
          <MagicIcon name="flame" size="sm" decorative />
          {friend.magicStreak}
        </span>
      )}
    </Link>
  );
}
