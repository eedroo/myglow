/**
 * Arranque do servidor: em produção valida a env da IA (Zod) e regista um erro claro se faltar algo.
 * Não impede o arranque — sem estas chaves a app funciona e as leituras IA ficam "a preparar".
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    const { assertEnv } = await import('./lib/env');
    try {
      assertEnv();
    } catch (err) {
      console.error(err instanceof Error ? err.message : err, '— funcionalidades de IA desactivadas até serem configuradas.');
    }
  }
}
