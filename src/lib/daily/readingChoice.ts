import type { ReadingChoice } from '@prisma/client';

/**
 * Leitura do dia: agora ou à noite (F18). Pergunta-se uma vez por dia, só hoje. Puro.
 * - dias passados: mostra sempre;
 * - sem escolha: pergunta;
 * - "agora": mostra;
 * - "à noite": espera até ao período da noite (e mostra no fecho do dia).
 */
export type ReadingGate = 'ask' | 'show' | 'wait';

export function readingGate(i: { choice: ReadingChoice | null; isToday: boolean; isNight: boolean }): ReadingGate {
  if (!i.isToday) return 'show';
  if (i.choice === null) return 'ask';
  if (i.choice === 'NOW') return 'show';
  return i.isNight ? 'show' : 'wait';
}
