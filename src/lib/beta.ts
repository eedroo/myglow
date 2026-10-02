import { betaInviteCodes } from '@/lib/env';

/** Beta (F10): registo opcional por código de convite (`BETA_INVITE_CODES`). */
export function normalizeInvite(code: string): string {
  return code.trim().toUpperCase();
}

/** O registo exige código quando `BETA_INVITE_CODES` não está vazio. */
export function inviteRequired(): boolean {
  return betaInviteCodes().length > 0;
}

export function isValidInvite(code: string): boolean {
  const c = normalizeInvite(code);
  return c !== '' && betaInviteCodes().includes(c);
}
