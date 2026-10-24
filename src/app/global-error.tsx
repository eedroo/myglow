'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import ptPT from '../../messages/pt-PT.json';
import ptBR from '../../messages/pt-BR.json';
import en from '../../messages/en.json';

/** Erro no próprio layout raiz (sem providers): manda para o Sentry e mostra uma página mínima na língua do browser. */
function texts() {
  const lang = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'pt';
  const m = lang.startsWith('pt-br') ? ptBR : lang.startsWith('pt') ? ptPT : en;
  return { message: m.common.errors.generic, retry: m.common.retry };
}

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  const t = texts();
  return (
    <html>
      <body>
        <p>{t.message}</p>
        <button type="button" className="mg-btn mg-btn--primary" onClick={reset}>
          {t.retry}
        </button>
      </body>
    </html>
  );
}
