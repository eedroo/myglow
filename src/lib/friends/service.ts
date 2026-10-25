import 'server-only';
import { db } from '@/lib/db';
import { canSendRequest, FRIENDS_LIMITS, isExpired, pairKey, type RequestBlockReason } from './rules';
import { areFriends, friendsCount, isBlockedEitherWay } from './queries';
import { notifyFriend } from './notify';

/**
 * Pedir e aceitar amizade (F15), partilhado pelas actions e pelo fim do onboarding (convite por link).
 * Não sabe de sessões nem de rate limits: isso fica nas actions.
 */
export type RequestOutcome = { ok: true; status: 'sent' | 'accepted' | 'pending' | 'friends' } | { ok: false; reason: RequestBlockReason };

export async function requestFriendship(fromId: string, toId: string): Promise<RequestOutcome> {
  const now = new Date();
  const ttlStart = new Date(now.getTime() - FRIENDS_LIMITS.requestTtlDays * 86_400_000);
  const [friends, blocked, existing, incoming, fromCount, toCount, pendingSent] = await Promise.all([
    areFriends(fromId, toId),
    isBlockedEitherWay(fromId, toId),
    db.friendRequest.findUnique({ where: { fromId_toId: { fromId, toId } }, select: { status: true, createdAt: true, respondedAt: true } }),
    db.friendRequest.findUnique({ where: { fromId_toId: { fromId: toId, toId: fromId } }, select: { id: true, status: true, createdAt: true } }),
    friendsCount(fromId),
    friendsCount(toId),
    db.friendRequest.count({ where: { fromId, status: 'PENDING', createdAt: { gte: ttlStart } } }),
  ]);
  const incomingPending = incoming?.status === 'PENDING' && !isExpired(incoming.createdAt, now);
  const check = canSendRequest({
    fromId, toId, now, areFriends: friends, blockedEitherWay: blocked, existing, incomingPending,
    fromFriendsCount: fromCount, toFriendsCount: toCount, fromPendingSent: pendingSent,
  });
  if (!check.ok) {
    // O outro já tinha pedido: amizade imediata.
    if (check.reason === 'incoming-exists' && incoming) {
      return (await acceptRequest(incoming.id, fromId)) ? { ok: true, status: 'accepted' } : { ok: false, reason: 'blocked' };
    }
    if (check.reason === 'pending-exists') return { ok: true, status: 'pending' };
    if (check.reason === 'already-friends') return { ok: true, status: 'friends' };
    return check;
  }

  const req = await db.friendRequest.upsert({
    where: { fromId_toId: { fromId, toId } },
    create: { fromId, toId },
    update: { status: 'PENDING', createdAt: now, respondedAt: null },
    select: { id: true, createdAt: true, from: { select: { name: true } } },
  });
  await notifyFriend('FRIEND_REQUEST', toId, req.from.name, req);
  return { ok: true, status: 'sent' };
}

/**
 * Aceita um pedido (só o destinatário). Cria a amizade, fecha o pedido inverso e avisa quem pediu.
 * `false` se o pedido não existe, já não está pendente, expirou, há bloqueio ou um dos lados está no limite.
 */
export async function acceptRequest(requestId: string, userId: string): Promise<boolean> {
  const now = new Date();
  const req = await db.friendRequest.findUnique({
    where: { id: requestId },
    select: { id: true, fromId: true, toId: true, status: true, createdAt: true, to: { select: { name: true } } },
  });
  if (!req || req.toId !== userId || req.status !== 'PENDING' || isExpired(req.createdAt, now)) return false;
  if (await isBlockedEitherWay(req.fromId, req.toId)) return false;
  const [a, b] = await Promise.all([friendsCount(req.fromId), friendsCount(req.toId)]);
  if (a >= FRIENDS_LIMITS.maxFriends || b >= FRIENDS_LIMITS.maxFriends) return false;

  await db.$transaction([
    db.friendRequest.update({ where: { id: req.id }, data: { status: 'ACCEPTED', respondedAt: now } }),
    // skipDuplicates em vez de apanhar P2002: um erro abortaria a transacção.
    db.friendship.createMany({ data: [pairKey(req.fromId, req.toId)], skipDuplicates: true }),
    db.friendRequest.updateMany({
      where: { fromId: req.toId, toId: req.fromId, status: 'PENDING' },
      data: { status: 'CANCELLED', respondedAt: now },
    }),
  ]);
  await notifyFriend('FRIEND_ACCEPTED', req.fromId, req.to.name, { id: req.id, createdAt: now });
  return true;
}
