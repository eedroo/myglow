import type { TourEvent } from './steps';

/**
 * Emissor mínimo para as acções reais da pessoa chegarem ao guia (gravações, lições), sem acoplar componentes.
 * Os efeitos dos filhos correm antes dos do pai: um evento emitido ao montar (ex.: `lesson-opened`) pode chegar
 * antes de o `TourProvider` estar a ouvir. Sem ninguém a ouvir, guarda os eventos dos últimos segundos e
 * entrega-os ao primeiro que começar.
 */
type Listener = (event: TourEvent) => void;
const listeners = new Set<Listener>();
const PENDING_MS = 3000;
let pending: { event: TourEvent; at: number }[] = [];

export function emitTourEvent(event: TourEvent): void {
  if (!listeners.size) {
    pending.push({ event, at: Date.now() });
    return;
  }
  for (const l of [...listeners]) l(event);
}

/** Devolve a função para deixar de ouvir. */
export function onTourEvent(cb: Listener): () => void {
  listeners.add(cb);
  const fresh = pending.filter((p) => Date.now() - p.at <= PENDING_MS);
  pending = [];
  for (const p of fresh) cb(p.event);
  return () => {
    listeners.delete(cb);
  };
}

/** Eventos do guia a partir do que o diário acabou de gravar com sucesso. */
export function dailyTourEvents(patch: { intention?: string; morningBanishDone?: boolean; wakeMood?: number | null }): TourEvent[] {
  const out: TourEvent[] = [];
  if (patch.intention?.trim()) out.push('intention-saved');
  if (patch.morningBanishDone === true) out.push('morning-banish-done');
  if (patch.wakeMood != null) out.push('wake-mood-set');
  return out;
}

/** Eventos do guia a partir do que a semana acabou de gravar com sucesso. */
export function weekTourEvents(patch: { intention?: string }): TourEvent[] {
  return patch.intention?.trim() ? ['week-intention-saved'] : [];
}
