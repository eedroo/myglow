'use server';

import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { allowFriendCodeChange, allowFriendRequest } from '@/lib/ratelimit';
import { CODE_ALPHABET, generateFriendCode, handleProblem, isFriendCode, normalizeCode, normalizeHandle, parseFriendInput } from '@/lib/friends/rules';
import { acceptRequest, requestFriendship } from '@/lib/friends/service';
import { setFriendInviteCookie } from '@/lib/friends/invite';

/**
 * Acções dos Amigos (F15). Todas com sessão e Zod. Nunca revelam se uma conta existe: qualquer código
 * inexistente, próprio, bloqueado ou indisponível dá o mesmo erro; recusar e remover são silenciosos.
 */
export type FriendActionResult =
  | { ok: true; status?: 'sent' | 'accepted' | 'pending' | 'friends' }
  | { ok: false; error: string };

const GENERIC = 'friends.errors.invalidCode';
const idSchema = z.string().min(1).max(64);

async function sessionId(): Promise<string | null> {
  const s = await auth();
  return s?.user?.id ?? null;
}

const done = (): FriendActionResult => {
  revalidatePath('/friends');
  revalidatePath('/profile');
  return { ok: true };
};

/** Pede amizade por código de 8 caracteres ou por @. */
export async function sendFriendRequestByCode(input: string): Promise<FriendActionResult> {
  const userId = await sessionId();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = z.string().trim().min(1).max(40).safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };
  if (!(await allowFriendRequest(userId))) return { ok: false, error: 'friends.errors.rateLimited' };

  const { code, handle } = parseFriendInput(parsed.data);
  const target =
    (code && (await db.user.findUnique({ where: { friendCode: code }, select: { id: true, onboardedAt: true } }))) ||
    (handle && (await db.user.findUnique({ where: { handle }, select: { id: true, onboardedAt: true } }))) ||
    null;
  if (!target?.onboardedAt) return { ok: false, error: GENERIC };

  const res = await requestFriendship(userId, target.id);
  if (!res.ok) return { ok: false, error: res.reason === 'limit-pending' ? 'friends.errors.limitPending' : GENERIC };
  revalidatePath('/friends');
  return { ok: true, status: res.status };
}

export async function acceptFriendRequest(id: string): Promise<FriendActionResult> {
  const userId = await sessionId();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = idSchema.safeParse(id);
  if (!parsed.success || !(await acceptRequest(parsed.data, userId))) return { ok: false, error: 'friends.errors.unavailable' };
  return done();
}

/** Recusa em silêncio (sem aviso a quem pediu). */
export async function declineFriendRequest(id: string): Promise<FriendActionResult> {
  const userId = await sessionId();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: 'common.errors.generic' };
  await db.friendRequest.updateMany({ where: { id: parsed.data, toId: userId, status: 'PENDING' }, data: { status: 'DECLINED', respondedAt: new Date() } });
  return done();
}

export async function cancelFriendRequest(id: string): Promise<FriendActionResult> {
  const userId = await sessionId();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: 'common.errors.generic' };
  await db.friendRequest.updateMany({ where: { id: parsed.data, fromId: userId, status: 'PENDING' }, data: { status: 'CANCELLED', respondedAt: new Date() } });
  return done();
}

const pairWhere = (a: string, b: string) => (a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a });

/** Remove a amizade (silencioso para o outro). */
export async function removeFriend(friendId: string): Promise<FriendActionResult> {
  const userId = await sessionId();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = idSchema.safeParse(friendId);
  if (!parsed.success) return { ok: false, error: 'common.errors.generic' };
  await db.friendship.deleteMany({ where: pairWhere(userId, parsed.data) });
  done();
  redirect('/friends');
}

/** Bloqueia: apaga a amizade e os pedidos pendentes nos dois sentidos. */
export async function blockUser(targetId: string): Promise<FriendActionResult> {
  const userId = await sessionId();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = idSchema.safeParse(targetId);
  if (!parsed.success || parsed.data === userId) return { ok: false, error: 'common.errors.generic' };
  const exists = await db.user.count({ where: { id: parsed.data } });
  if (!exists) return { ok: false, error: 'common.errors.generic' };
  const now = new Date();
  await db.$transaction([
    db.userBlock.createMany({ data: [{ blockerId: userId, blockedId: parsed.data }], skipDuplicates: true }),
    db.friendship.deleteMany({ where: pairWhere(userId, parsed.data) }),
    db.friendRequest.updateMany({
      where: { status: 'PENDING', OR: [{ fromId: userId, toId: parsed.data }, { fromId: parsed.data, toId: userId }] },
      data: { status: 'CANCELLED', respondedAt: now },
    }),
  ]);
  done();
  redirect('/friends');
}

export async function unblockUser(targetId: string): Promise<FriendActionResult> {
  const userId = await sessionId();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = idSchema.safeParse(targetId);
  if (!parsed.success) return { ok: false, error: 'common.errors.generic' };
  await db.userBlock.deleteMany({ where: { blockerId: userId, blockedId: parsed.data } });
  revalidatePath('/settings');
  return { ok: true };
}

/** Novo código: o link antigo deixa de funcionar. 3 por dia. */
export async function regenerateFriendCode(): Promise<FriendActionResult> {
  const userId = await sessionId();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  if (!(await allowFriendCodeChange(userId))) return { ok: false, error: 'friends.errors.rateLimited' };
  for (let attempt = 0; attempt < 5; attempt++) {
    const friendCode = generateFriendCode(() => randomInt(CODE_ALPHABET.length) / CODE_ALPHABET.length);
    try {
      await db.user.update({ where: { id: userId }, data: { friendCode } });
      return done();
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
    }
  }
  return { ok: false, error: 'common.errors.generic' };
}

/** Escolhe (ou apaga, com vazio) o @. */
export async function setHandle(input: string): Promise<FriendActionResult> {
  const userId = await sessionId();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = z.string().max(40).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'friends.errors.handleChars' };
  const handle = normalizeHandle(parsed.data);
  if (handle === '') {
    await db.user.update({ where: { id: userId }, data: { handle: null } });
    return done();
  }
  const problem = handleProblem(handle);
  if (problem) return { ok: false, error: problem === 'length' ? 'friends.errors.handleLength' : problem === 'reserved' ? 'friends.errors.handleTaken' : 'friends.errors.handleChars' };
  try {
    await db.user.update({ where: { id: userId }, data: { handle } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return { ok: false, error: 'friends.errors.handleTaken' };
    throw err;
  }
  return done();
}

export async function setShowBigThree(value: boolean): Promise<FriendActionResult> {
  const userId = await sessionId();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = z.boolean().safeParse(value);
  if (!parsed.success) return { ok: false, error: 'common.errors.generic' };
  await db.user.update({ where: { id: userId }, data: { showBigThree: parsed.data } });
  revalidatePath('/settings');
  return done();
}

/** Página pública do convite, sem sessão: guarda o código e segue para o registo. */
export async function startInviteSignup(code: string): Promise<void> {
  const c = normalizeCode(z.string().max(20).catch('').parse(code));
  if (isFriendCode(c)) setFriendInviteCookie(c);
  redirect('/register');
}

/** Avisos de amigos por push (a caixa de avisos recebe sempre). */
export async function setFriendNotifications(value: boolean): Promise<FriendActionResult> {
  const userId = await sessionId();
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = z.boolean().safeParse(value);
  if (!parsed.success) return { ok: false, error: 'common.errors.generic' };
  await db.notificationPrefs.upsert({ where: { userId }, create: { userId, friends: parsed.data }, update: { friends: parsed.data } });
  revalidatePath('/settings');
  return { ok: true };
}
