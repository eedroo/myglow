import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { buildEntitlements, type Entitlements } from './entitlements';
import { isFeatureKey, type FeatureKey } from './features';

/**
 * Direitos da pessoa, lidos da base em cada pedido (nunca do JWT): uma mudança de plano tem efeito logo.
 * `cache()` evita repetir as consultas no mesmo render.
 */
export const getEntitlements = cache(async (userId: string): Promise<Entitlements> => {
  const [user, flags, overrides] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { plan: true, planExpiresAt: true } }),
    db.featureFlag.findMany({ select: { key: true, rollout: true } }),
    db.featureOverride.findMany({ where: { userId }, select: { key: true, enabled: true } }),
  ]);
  return buildEntitlements(
    { plan: user?.plan ?? 'FREE', planExpiresAt: user?.planExpiresAt ?? null },
    Object.fromEntries(flags.filter((f) => isFeatureKey(f.key)).map((f) => [f.key, f.rollout])),
    Object.fromEntries(overrides.filter((o) => isFeatureKey(o.key)).map((o) => [o.key, o.enabled])),
    new Date(),
  );
});

/** A verificação que conta (páginas e actions premium): sem direito → `notFound()`. */
export async function requireFeature(userId: string, key: FeatureKey): Promise<void> {
  const ent = await getEntitlements(userId);
  if (!ent.features[key]) notFound();
}
