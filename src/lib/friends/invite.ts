import 'server-only';
import { cookies } from 'next/headers';
import { appUrl } from '@/lib/env';
import { db } from '@/lib/db';
import { isFriendCode, normalizeCode } from './rules';

/**
 * Convite por link (F15): `/f/{código}`. Sem sessão, o código fica num cookie até ao fim do registo e do
 * onboarding do nascimento; aí cria-se o pedido para quem convidou.
 */
export const FRIEND_INVITE_COOKIE = 'mg_friend_invite';
/** Valor do campo de convite escondido no registo (o que conta é o cookie, verificado no servidor). */
export const FRIEND_INVITE_PLACEHOLDER = 'AMIGO';
const MAX_AGE = 30 * 24 * 60 * 60;

export function friendInviteUrl(code: string): string {
  return `${appUrl()}/f/${code}`;
}

export function setFriendInviteCookie(code: string): void {
  cookies().set(FRIEND_INVITE_COOKIE, code, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: MAX_AGE, path: '/' });
}

export function clearFriendInviteCookie(): void {
  cookies().delete(FRIEND_INVITE_COOKIE);
}

/** Código do cookie, se for um código válido. */
export function readFriendInviteCookie(): string | null {
  const raw = cookies().get(FRIEND_INVITE_COOKIE)?.value;
  if (!raw) return null;
  const code = normalizeCode(raw);
  return isFriendCode(code) ? code : null;
}

/** Quem tem este código (conta com onboarding feito), ou `null`. */
export async function inviterByCode(code: string): Promise<{ id: string; name: string } | null> {
  const u = await db.user.findUnique({ where: { friendCode: code }, select: { id: true, name: true, onboardedAt: true } });
  return u?.onboardedAt ? { id: u.id, name: u.name } : null;
}

/** Quem convidou, a partir do cookie (registo e fim do onboarding). */
export async function inviterFromCookie(): Promise<{ id: string; name: string } | null> {
  const code = readFriendInviteCookie();
  return code ? inviterByCode(code) : null;
}
