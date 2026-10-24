import type { FeatureRollout, Plan } from '@prisma/client';
import { FEATURE_KEYS, FEATURES, type FeatureKey } from './features';

/** Direitos de cada pessoa (F12). Puro: os dados entram como argumentos. */
export interface PlanInfo {
  plan: Plan;
  planExpiresAt: Date | null;
}

/** PREMIUM com data de fim no passado → FREE. */
export function effectivePlan(info: PlanInfo, now: Date): Plan {
  if (info.plan === 'PREMIUM' && info.planExpiresAt && info.planExpiresAt.getTime() <= now.getTime()) return 'FREE';
  return info.plan;
}

/** A excepção da pessoa vence sempre; senão o interruptor global decide. */
export function canUse(_key: FeatureKey, ctx: { plan: Plan; rollout: FeatureRollout; override: boolean | null }): boolean {
  if (ctx.override !== null) return ctx.override;
  if (ctx.rollout === 'HIDDEN') return false;
  if (ctx.rollout === 'PREMIUM') return ctx.plan === 'PREMIUM';
  return true;
}

export interface Entitlements {
  plan: Plan;
  features: Record<FeatureKey, boolean>;
}

export function buildEntitlements(
  info: PlanInfo,
  flags: Partial<Record<FeatureKey, FeatureRollout>>,
  overrides: Partial<Record<FeatureKey, boolean>>,
  now: Date,
): Entitlements {
  const plan = effectivePlan(info, now);
  const features = Object.fromEntries(
    FEATURE_KEYS.map((key) => [
      key,
      canUse(key, { plan, rollout: flags[key] ?? FEATURES[key].defaultRollout, override: overrides[key] ?? null }),
    ]),
  ) as Record<FeatureKey, boolean>;
  return { plan, features };
}
