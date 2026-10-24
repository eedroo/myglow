import { scrubEvent } from './scrub';

/**
 * Opções comuns do Sentry (cliente, servidor e edge). Só activo com DSN (em dev fica desligado); sem PII nem
 * Session Replay; 10% das transacções; tudo passa por `scrubEvent`; erros esperados não são enviados.
 */
export function isExpectedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { digest?: unknown; message?: unknown; statusCode?: unknown };
  const digest = typeof e.digest === 'string' ? e.digest : '';
  const message = typeof e.message === 'string' ? e.message : '';
  // redirect() e notFound() do Next; sessão expirada; subscrições de push que já não existem (404/410).
  if (/^NEXT_(REDIRECT|NOT_FOUND)/.test(digest) || /^NEXT_(REDIRECT|NOT_FOUND)/.test(message)) return true;
  if (message === 'common.errors.unauthorized') return true;
  return e.statusCode === 404 || e.statusCode === 410;
}

export function sentryOptions(dsn: string | undefined) {
  return {
    dsn,
    enabled: !!dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    ignoreErrors: ['NEXT_REDIRECT', 'NEXT_NOT_FOUND'],
    beforeSend<T extends object>(event: T, hint?: { originalException?: unknown }): T | null {
      if (isExpectedError(hint?.originalException)) return null;
      return scrubEvent(event);
    },
    beforeSendTransaction<T extends object>(event: T): T {
      return scrubEvent(event);
    },
  };
}
