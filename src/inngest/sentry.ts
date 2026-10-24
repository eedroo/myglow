import * as Sentry from '@sentry/nextjs';

/**
 * Falha final de uma função Inngest (depois dos retries) → Sentry, com `job` para filtrar. Só o erro: os dados
 * do evento (ids, datas) não seguem.
 */
export function reportJobFailure(job: string) {
  return async ({ error }: { error: Error }) => {
    Sentry.captureException(error, { tags: { job } });
    await Sentry.flush(2000);
  };
}
