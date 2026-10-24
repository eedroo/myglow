/** Funil do onboarding: registo → nascimento → guia concluído → primeira lição → primeiro dia completo. */
export interface FunnelCounts {
  registered: number;
  birthDone: number;
  tourDone: number;
  firstLesson: number;
  firstCompleteDay: number;
}

const ORDER: (keyof FunnelCounts)[] = ['registered', 'birthDone', 'tourDone', 'firstLesson', 'firstCompleteDay'];

/** % de cada passo em relação ao anterior (o primeiro é 100%; passo anterior 0 → 0). */
export function funnelRates(c: FunnelCounts): { step: keyof FunnelCounts; count: number; pctOfPrev: number }[] {
  return ORDER.map((step, i) => {
    const prev = i === 0 ? c.registered : c[ORDER[i - 1]!];
    return { step, count: c[step], pctOfPrev: prev ? Math.round((100 * c[step]) / prev) : 0 };
  });
}
