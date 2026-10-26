'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import ptPT from '../../messages/pt-PT.json';
import ptBR from '../../messages/pt-BR.json';
import en from '../../messages/en.json';
import { RELOAD_KEY, shouldAutoReload } from '@/lib/errors/recover';

/** Erro no próprio layout raiz (sem providers): manda para o Sentry e mostra uma página mínima na língua do browser. */
function texts() {
  const lang = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'pt';
  const m = lang.startsWith('pt-br') ? ptBR : lang.startsWith('pt') ? ptPT : en;
  return { message: m.common.errors.generic, retry: m.common.retry };
}

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // F18: rede a voltar do segundo plano ou versão nova da app → recarrega sozinho (uma vez por minuto).
    let last: number | null = null;
    try {
      last = Number(window.sessionStorage.getItem(RELOAD_KEY)) || null;
    } catch {}
    if (shouldAutoReload(error, last, Date.now())) {
      try {
        window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      } catch {}
      window.location.reload();
      return;
    }
    Sentry.captureException(error);
  }, [error]);
  const t = texts();
  return (
    <html>
      <body>
        <p>{t.message}</p>
        {/* Aqui o layout raiz falhou: repor raramente chega; recarregar a página resolve. */}
        <button type="button" className="mg-btn mg-btn--primary" onClick={() => (reset(), window.location.reload())}>
          {t.retry}
        </button>
      </body>
    </html>
  );
}
