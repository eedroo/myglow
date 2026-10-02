/**
 * Invalidação de sessões (JWT): o token leva `sv` (sessionVersion do utilizador quando entrou) e
 * `svCheckedAt`. A cada 5 min o callback `jwt` relê `User.sessionVersion`; se mudou (ou a conta foi apagada),
 * a sessão termina. Puro.
 */
export const SESSION_RECHECK_MS = 5 * 60 * 1000;

export function shouldRecheck(svCheckedAt: number | undefined, now: number): boolean {
  return typeof svCheckedAt !== 'number' || now - svCheckedAt > SESSION_RECHECK_MS;
}

/** `dbSv` null = utilizador inexistente. Tokens anteriores à F9 não têm `sv` (equivale a 0). */
export function isSessionValid(tokenSv: number | undefined, dbSv: number | null): boolean {
  return dbSv !== null && (tokenSv ?? 0) === dbSv;
}
