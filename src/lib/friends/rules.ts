import type { FriendRequestStatus } from '@prisma/client';

/**
 * Amigos (F15): regras puras. Só amizades mútuas (pedido + aceitação), por link pessoal, código de
 * 8 caracteres ou @ escolhido pela pessoa. Sem pesquisa por email.
 */
export const FRIENDS_LIMITS = {
  maxFriends: 100,
  maxPendingSent: 30,
  requestsPerDay: 20,
  requestTtlDays: 30, // pendentes expiram
  resendCooldownDays: 7, // depois de recusado ou cancelado
} as const;

const DAY_MS = 86_400_000;

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I
export const CODE_LENGTH = 8;

export function generateFriendCode(rand: () => number): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  return out;
}

/** Trim, maiúsculas, sem espaços nem hífenes. */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]+/g, '');
}

export function isFriendCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

/** "ABCDEFGH" → "ABCD-EFGH" (só para mostrar). */
export function formatFriendCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// ─── @ escolhido pela pessoa ──────────────────────────────────────────────────────────────────────

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/;
const RESERVED = new Set(['admin', 'myglow', 'onda', 'suporte', 'support', 'ajuda', 'help', 'guia', 'guide', 'oficial', 'official', 'equipa', 'equipe', 'team']);

/** Sem o "@", trim e minúsculas. */
export function normalizeHandle(input: string): string {
  return input.trim().replace(/^@+/, '').toLowerCase();
}

export type HandleProblem = 'length' | 'chars' | 'reserved';

/** `null` se o @ (já normalizado) é válido. */
export function handleProblem(handle: string): HandleProblem | null {
  if (handle.length < HANDLE_MIN || handle.length > HANDLE_MAX) return 'length';
  if (!HANDLE_RE.test(handle) || handle.includes('..')) return 'chars';
  if (RESERVED.has(handle)) return 'reserved';
  return null;
}

/**
 * O que a pessoa escreveu em "Tenho um código": um código de 8 caracteres ou um @.
 * Com "@" à frente é sempre um @; sem ele, um código válido ganha, senão tenta-se como @.
 */
export function parseFriendInput(input: string): { code: string | null; handle: string | null } {
  const raw = input.trim();
  const handle = normalizeHandle(raw);
  const handleOk = handleProblem(handle) === null ? handle : null;
  if (raw.startsWith('@')) return { code: null, handle: handleOk };
  const code = normalizeCode(raw);
  return { code: isFriendCode(code) ? code : null, handle: handleOk };
}

// ─── Pedidos ───────────────────────────────────────────────────────────────────────────────────────

/** Um registo por par, com o menor id primeiro. */
export function pairKey(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

export function isExpired(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() > FRIENDS_LIMITS.requestTtlDays * DAY_MS;
}

export type RequestBlockReason =
  | 'self'
  | 'already-friends'
  | 'blocked'
  | 'pending-exists'
  | 'incoming-exists'
  | 'cooldown'
  | 'limit-friends'
  | 'limit-pending';

export function canSendRequest(i: {
  fromId: string;
  toId: string;
  now: Date;
  areFriends: boolean;
  blockedEitherWay: boolean;
  existing: { status: FriendRequestStatus; createdAt: Date; respondedAt: Date | null } | null; // from → to
  incomingPending: boolean; // to → from já pendente
  fromFriendsCount: number;
  toFriendsCount: number;
  fromPendingSent: number;
}): { ok: true } | { ok: false; reason: RequestBlockReason } {
  const no = (reason: RequestBlockReason) => ({ ok: false as const, reason });
  if (i.fromId === i.toId) return no('self');
  if (i.blockedEitherWay) return no('blocked');
  if (i.areFriends) return no('already-friends');
  // O outro já pediu: a acção aceita esse pedido (amizade imediata) em vez de criar outro.
  if (i.incomingPending) return no('incoming-exists');
  const e = i.existing;
  if (e?.status === 'PENDING' && !isExpired(e.createdAt, i.now)) return no('pending-exists');
  if ((e?.status === 'DECLINED' || e?.status === 'CANCELLED') && e.respondedAt) {
    if (i.now.getTime() - e.respondedAt.getTime() < FRIENDS_LIMITS.resendCooldownDays * DAY_MS) return no('cooldown');
  }
  if (i.fromFriendsCount >= FRIENDS_LIMITS.maxFriends || i.toFriendsCount >= FRIENDS_LIMITS.maxFriends) return no('limit-friends');
  if (i.fromPendingSent >= FRIENDS_LIMITS.maxPendingSent) return no('limit-pending');
  return { ok: true };
}

/** Iniciais do nome (até 2), como no `LevelBadge`. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0]!, parts[parts.length - 1]!] : parts.slice(0, 1);
  return letters.map((p) => p.charAt(0).toUpperCase()).join('') || '·';
}

/** Primeiro nome (avisos e partilha). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}
