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
