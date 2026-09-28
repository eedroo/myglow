'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { patchDailyEntry } from '@/actions/daily';
import { isDailyTextField, type DailyEntryData, type DailyField, type DailyPatch } from '@/types/daily';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

const TEXT_DEBOUNCE_MS = 800;
const RETRY_MS = 15_000;

const isEmpty = (p: DailyPatch) => Object.keys(p).length === 0;

/**
 * Estado do diário com gravação automática.
 * - checks e escalas gravam logo; textos com debounce de 800 ms (e `flush` no blur)
 * - alterações pendentes juntam-se num único patch; um pedido de cada vez
 * - falha de rede → `offline`, mantém pendentes e tenta de novo no `online` e a cada 15 s
 * - falha de validação → `error` (a chave i18n fica em `errorKey`)
 */
export function useDailyAutosave(date: string, initial: DailyEntryData) {
  const [data, setData] = useState<DailyEntryData>(initial);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const pending = useRef<DailyPatch>({});
  const inFlight = useRef<Promise<void> | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateRef = useRef(date);
  const mounted = useRef(true);

  const setSafeStatus = useCallback((s: SaveStatus) => {
    if (mounted.current) setStatus(s);
  }, []);

  /** Envia pendentes em série até esvaziar (ou ficar offline). */
  const drain = useCallback(async (): Promise<void> => {
    if (inFlight.current) return inFlight.current;

    const run = async () => {
      while (!isEmpty(pending.current)) {
        const targetDate = dateRef.current;
        const patch = pending.current;
        pending.current = {};
        setSafeStatus('saving');
        try {
          const result = await patchDailyEntry(targetDate, patch);
          if (result.ok) {
            if (mounted.current && dateRef.current === targetDate) {
              setData((d) => ({ ...d, updatedAt: result.updatedAt }));
            }
            if (isEmpty(pending.current)) setSafeStatus('saved');
          } else {
            // Erro de validação: não adianta repetir o mesmo patch.
            if (mounted.current) setErrorKey(result.error);
            setSafeStatus('error');
          }
        } catch {
          // Falha de rede: devolve o patch à fila (alterações mais recentes ganham) e pára.
          pending.current = { ...patch, ...pending.current };
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
    if (!isEmpty(pending.current) && typeof navigator !== 'undefined' && navigator.onLine) {
      await drain();
    }
  }, [setSafeStatus]);

  const flush = useCallback(async () => {
    if (debounce.current) {
      clearTimeout(debounce.current);
      debounce.current = null;
    }
    if (isEmpty(pending.current)) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSafeStatus('offline');
      return;
    }
    await drain();
  }, [drain, setSafeStatus]);

  const setField = useCallback(
    <K extends DailyField>(key: K, value: DailyEntryData[K]) => {
      setData((d) => ({ ...d, [key]: value }));
      pending.current = { ...pending.current, [key]: value };
      setErrorKey(null);
      if (isDailyTextField(key)) {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => void flush(), TEXT_DEBOUNCE_MS);
      } else {
        void flush();
      }
    },
    [flush],
  );

  // Mudança de dia: grava o que falta do dia anterior e carrega o novo.
  useEffect(() => {
    if (dateRef.current === date) return;
    void flush().then(() => {
      dateRef.current = date;
      setData(initial);
      setSafeStatus('idle');
    });
  }, [date, initial, flush, setSafeStatus]);

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
      if (!isEmpty(pending.current) || inFlight.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Ao desmontar (navegação para outro dia): envia o que estiver pendente.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (debounce.current) clearTimeout(debounce.current);
      if (!isEmpty(pending.current)) void drain();
    };
  }, [drain]);

  return { data, setField, status, errorKey, flush };
}
