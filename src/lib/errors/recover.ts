/**
 * Erros que se resolvem recarregando a app (F18): rede a voltar do segundo plano, Server Action ou chunk de uma
 * versão anterior depois de um deploy. Puro (a decisão de recarregar usa um carimbo guardado pelo chamador).
 */
const PATTERNS = [
  /chunkloaderror/i,
  /loading (css )?chunk/i,
  /failed to fetch/i,
  /load failed/i,
  /networkerror/i,
  /network request failed/i,
  /unexpected response was received from the server/i,
  /failed to find server action/i,
  /importing a module script failed/i,
  /dynamically imported module/i,
];

export function isRecoverableError(error: { name?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const text = `${error.name ?? ''} ${error.message ?? ''}`;
  return PATTERNS.some((re) => re.test(text));
}

export const RELOAD_KEY = 'mg-error-reload-at';
export const RELOAD_COOLDOWN_MS = 60_000;

/** Recarregar sozinho só se não houve outro recarregamento automático no último minuto (evita ciclos). */
export function shouldAutoReload(error: { name?: string; message?: string } | null | undefined, lastReloadAt: number | null, now: number): boolean {
  return isRecoverableError(error) && (lastReloadAt === null || now - lastReloadAt > RELOAD_COOLDOWN_MS);
}
