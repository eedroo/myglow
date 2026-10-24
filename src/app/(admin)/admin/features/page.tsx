import { db } from '@/lib/db';
import { FEATURES, FEATURE_KEYS } from '@/lib/entitlements/features';
import { GlassCard } from '@/components/ui/GlassCard';
import { FeatureRolloutRow } from '@/components/admin/FeatureRolloutRow';

/** Interruptores globais (efeito imediato, sem novo deploy) e nº de excepções por funcionalidade. */
export default async function AdminFeaturesPage() {
  const [flags, overrides] = await Promise.all([
    db.featureFlag.findMany({ select: { key: true, rollout: true } }),
    db.featureOverride.groupBy({ by: ['key'], _count: { _all: true } }),
  ]);
  const rollout = new Map(flags.map((f) => [f.key, f.rollout]));
  const count = new Map(overrides.map((o) => [o.key, o._count._all]));
  return (
    <>
      <h1 className="mg-admin__title">Funcionalidades</h1>
      <p className="mg-admin__note">Escondida: ninguém (só excepções). Premium: quem é premium. Todos: toda a gente.</p>
      <GlassCard>
        {FEATURE_KEYS.map((key) => (
          <FeatureRolloutRow
            key={key}
            featureKey={key}
            phase={FEATURES[key].phase}
            rollout={rollout.get(key) ?? FEATURES[key].defaultRollout}
            overrides={count.get(key) ?? 0}
          />
        ))}
      </GlassCard>
    </>
  );
}
