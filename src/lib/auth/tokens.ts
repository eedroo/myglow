import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import type { AuthToken, AuthTokenType } from '@prisma/client';
import { db } from '@/lib/db';

/**
 * Tokens de email (confirmação, recuperação, alteração de email). O valor em claro só viaja no email;
 * na DB fica apenas o hash SHA-256. Uso único e com expiração.
 */
export const TOKEN_TTL: Record<AuthTokenType, number> = { EMAIL_VERIFY: 24 * 3600, PASSWORD_RESET: 3600, EMAIL_CHANGE: 3600 }; // segundos

/** 32 bytes aleatórios em base64url + o respectivo hash. */
export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Cria um token novo (apaga os anteriores do mesmo tipo) e devolve o valor em claro para o email. */
export async function createAuthToken(userId: string, type: AuthTokenType, newEmail?: string): Promise<string> {
  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL[type] * 1000);
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, type } }),
    db.authToken.create({ data: { userId, type, tokenHash: hash, newEmail: newEmail ?? null, expiresAt } }),
  ]);
  return raw;
}

/** `null` se não existir, for de outro tipo, estiver expirado ou já usado. Marca `usedAt` (uma só vez). */
export async function consumeAuthToken(raw: string, type: AuthTokenType): Promise<AuthToken | null> {
  if (!raw || raw.length > 200) return null;
  const tokenHash = hashToken(raw);
  return db.$transaction(async (tx) => {
    const token = await tx.authToken.findUnique({ where: { tokenHash } });
    if (!token || token.type !== type || token.usedAt || token.expiresAt.getTime() <= Date.now()) return null;
    const usedAt = new Date();
    // Condicional: dois pedidos em simultâneo não consomem o mesmo token.
    const { count } = await tx.authToken.updateMany({ where: { id: token.id, usedAt: null }, data: { usedAt } });
    return count === 1 ? { ...token, usedAt } : null;
  });
}
