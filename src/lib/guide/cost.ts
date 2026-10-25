/**
 * Custo estimado do Guia (F14), só para o /admin. Preços em USD por milhão de tokens: editar aqui
 * quando o modelo ou o preço mudarem.
 */
export const GUIDE_PRICE_PER_MILLION = { input: 1.25, output: 10 } as const;

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens * GUIDE_PRICE_PER_MILLION.input + outputTokens * GUIDE_PRICE_PER_MILLION.output) / 1_000_000;
}
