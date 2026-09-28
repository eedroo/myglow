'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

export type SaveResult = { ok: true; updatedAt: string } | { ok: false; error: string };

const TEXT_DEBOUNCE_MS = 800;
const RETRY_MS = 15_000;

interface AutosaveQueueOptions<TPatch extends object> {
  save: (patch: TPatch) => Promise<SaveResult>;
  /** Junta dois patches; `b` é o mais recente e ganha em conflito. */
  merge: (a: TPatch, b: TPatch) => TPatch;
  /** Muda → grava o que estiver pendente com o `save` anterior e reinicia. */
  resetKey: string;
  onSaved?: (updatedAt: string) => void;
}

/**
 * Fila de gravação automática:
 * - `queue(patch, 'now')` grava logo; `'debounced'` espera 800 ms sem alterações (e `flush` no blur)
 * - patches pendentes juntam-se num só; um pedido de cada vez
 * - falha de rede → `offline`, mantém pendentes e repete no evento `online` e a cada 15 s
 * - falha de validação → `error` (chave i18n em `errorKey`)
 */
export function useAutosaveQueue<TPatch extends object>({ save, merge, resetKey, onSaved }: AutosaveQueueOptions<TPatch>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const pending = useRef<TPatch | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  // `save` ligado à chave actual; só muda depois de gravar o que é da chave anterior.
  const latest = useRef({ save, merge, onSaved });
  latest.current = { save, merge, onSaved };
  const bound = useRef({ key: resetKey, save, onSaved });

  const setSafeStatus = useCallback((s: SaveStatus) => {
    if (mounted.current) setStatus(s);
  }, []);

  const drain = useCallback(async (): Promise<void> => {
    if (inFlight.current) return inFlight.current;

    const run = async () => {
      while (pending.current) {
        const patch = pending.current;
        pending.current = null;
        const { key, save: doSave, onSaved: notify } = bound.current;
        setSafeStatus('saving');
        try {
          const result = await doSave(patch);
          if (result.ok) {
            if (mounted.current && bound.current.key === key) notify?.(result.updatedAt);
            if (!pending.current) setSafeStatus('saved');
          } else {
            // Erro de validação: não adianta repetir o mesmo patch.
            if (mounted.current) setErrorKey(result.error);
            setSafeStatus('error');
          }
        } catch {
          // Falha de rede: devolve o patch à fila (o mais recente ganha) e pára.
          pending.current = pending.current ? latest.current.merge(patch, pending.current) : patch;
          setSafeStatus('offline');
          return;
        }
      }
    };

    inFlight.current = run().finally(() => {
      inFlight.current = null;
    });
    await inFlight.current;
    // Chegaram alterações durante o pedido e não ficámos offline → envia a seguir.
    if (pending.current && typeof navigator !== 'undefined' && navigator.onLine) await drain();
  }, [setSafeStatus]);

  const flush = useCallback(async () => {
    if (debounce.current) {
      clearTimeout(debounce.current);
      debounce.current = null;
    }
    if (!pending.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSafeStatus('offline');
      return;
    }
    await drain();
  }, [drain, setSafeStatus]);

  const queue = useCallback(
    (patch: TPatch, mode: 'now' | 'debounced') => {
      pending.current = pending.current ? latest.current.merge(pending.current, patch) : patch;
      setErrorKey(null);
      // Há alterações por gravar: "Guardado" só volta a aparecer depois de gravarem mesmo.
      setSafeStatus('saving');
      if (mode === 'debounced') {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => void flush(), TEXT_DEBOUNCE_MS);
      } else {
        void flush();
      }
    },
    [flush, setSafeStatus],
  );

  // Mudança de chave: grava o que falta com o `save` anterior e passa a usar o novo.
  useEffect(() => {
    if (bound.current.key === resetKey) return;
    void flush().then(() => {
      bound.current = { key: resetKey, save: latest.current.save, onSaved: latest.current.onSaved };
      setSafeStatus('idle');
    });
  }, [resetKey, flush, setSafeStatus]);

  // Mantém o `save`/`onSaved` da chave actual em dia (ex.: closures novas a cada render).
  useEffect(() => {
    if (bound.current.key === resetKey) bound.current = { key: resetKey, save, onSaved };
  });

  // Reenvio automático quando a rede volta e a cada 15 s enquanto offline.
  useEffect(() => {
    const retry = () => void flush();
    window.addEventListener('online', retry);
    const timer = status === 'offline' ? setInterval(retry, RETRY_MS) : null;
    return () => {
      window.removeEventListener('online', retry);
      if (timer) clearInterval(timer);
    };
  }, [flush, status]);

  // Aviso ao sair com alterações por gravar.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current || inFlight.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Ao desmontar (navegação): envia o que estiver pendente.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (debounce.current) clearTimeout(debounce.current);
      if (pending.current) void drain();
    };
  }, [drain]);

  return { queue, flush, status, errorKey };
}
