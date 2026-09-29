/** Arranque do servidor: em produção, falha logo se faltar configuração (env validada com Zod). */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    const { assertEnv } = await import('./lib/env');
    assertEnv();
  }
}
