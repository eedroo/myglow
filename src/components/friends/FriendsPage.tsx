import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { LEVELS } from '@/lib/xp/levels';
import { PageHeader } from '@/components/shell/PageHeader';
import { listFriends, listIncoming, listOutgoing } from '@/lib/friends/queries';
import { formatFriendCode } from '@/lib/friends/rules';
import { friendInviteUrl } from '@/lib/friends/invite';
import { FriendRequestsList } from './FriendRequestsList';
import { FriendInviteCard } from './FriendInviteCard';
import { FriendList } from './FriendList';
import { OutgoingRequests } from './OutgoingRequests';

/** /friends: pedidos por responder, o meu convite, a lista de amigos e os pedidos enviados. */
export async function FriendsPage({ userId }: { userId: string }) {
  const [t, tg, me, friends, incoming, outgoing] = await Promise.all([
    getTranslations('friends'),
    getTranslations('glow'),
    db.user.findUniqueOrThrow({ where: { id: userId }, select: { friendCode: true, handle: true } }),
    listFriends(userId),
    listIncoming(userId),
    listOutgoing(userId),
  ]);
  const levelNames = Object.fromEntries(LEVELS.map((l) => [l.key, tg(`levels.${l.key}.name`)]));
  return (
    <div className="mg-friends">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {incoming.length > 0 && <FriendRequestsList requests={incoming} levelNames={levelNames} />}
      <FriendInviteCard code={formatFriendCode(me.friendCode)} handle={me.handle} inviteUrl={friendInviteUrl(me.friendCode)} />
      <FriendList friends={friends} />
      <OutgoingRequests requests={outgoing} />
    </div>
  );
}
