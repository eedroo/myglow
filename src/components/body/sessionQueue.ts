'use client';

import type { SetInput } from '@/lib/fitness/types';

/** Séries por enviar (sem rede): guardadas no dispositivo com o id e a hora reais, reenviadas ao voltar a rede. */
export interface QueuedSet extends SetInput {
  id: string;
  completedAt: string;
}

const key = (sessionId: string) => `mg-fitness-queue:${sessionId}`;

export function readQueue(sessionId: string): QueuedSet[] {
  try {
    const raw = window.localStorage.getItem(key(sessionId));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as QueuedSet[]) : [];
  } catch {
    return [];
  }
}

export function writeQueue(sessionId: string, list: QueuedSet[]): void {
  try {
    if (list.length) window.localStorage.setItem(key(sessionId), JSON.stringify(list));
    else window.localStorage.removeItem(key(sessionId));
  } catch {
    // armazenamento indisponível: a série fica só em memória
  }
}

/** Id compatível com o servidor (minúsculas e dígitos, 24 caracteres). */
export function newSetId(): string {
  const bytes = new Uint8Array(15);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('').padEnd(24, '0').slice(0, 24);
}

type SessionOp = { op: 'set'; set: QueuedSet } | { op: 'hidden'; hidden: boolean } | { op: 'notes'; notes: string };

/**
 * Escritas de fundo da sessão pela rota `/api/fitness/sessions/[id]` (F18). Sem rede devolve `null` e nunca lança:
 * uma Server Action falhada a voltar do segundo plano deixava a app no ecrã de erro.
 * `beacon` (ao esconder a app) usa `sendBeacon`, que o browser entrega mesmo com a página a ser suspensa.
 */
export async function postSession<T = { ok: boolean; error?: string }>(sessionId: string, body: SessionOp, beacon = false): Promise<T | null> {
  const url = `/api/fitness/sessions/${encodeURIComponent(sessionId)}`;
  const payload = JSON.stringify(body);
  try {
    if (beacon && typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url, payload)) return null;
    const res = await fetch(url, { method: 'POST', body: payload, keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok && res.status >= 500) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** A app está à vista e com rede (para refrescar dados do servidor sem arriscar um erro). */
export const canSync = () => typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine !== false;
