'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Plan } from '@prisma/client';
import type { Entitlements } from '@/lib/entitlements/entitlements';
import type { FeatureKey } from '@/lib/entitlements/features';

const EntitlementsContext = createContext<Entitlements | null>(null);

/** Direitos calculados no servidor (layout). Só decidem o que mostrar: a verificação que conta é no servidor. */
export function EntitlementsProvider({ value, children }: { value: Entitlements; children: ReactNode }) {
  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

export function useEntitlements(): { plan: Plan; can: (key: FeatureKey) => boolean } {
  const value = useContext(EntitlementsContext);
  return useMemo(
    () => ({ plan: value?.plan ?? 'FREE', can: (key: FeatureKey) => value?.features[key] ?? false }),
    [value],
  );
}
