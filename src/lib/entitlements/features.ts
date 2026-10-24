import type { FeatureRollout } from '@prisma/client';

/** Funcionalidades premium (F12). Sem linha em `FeatureFlag`, vale o `defaultRollout` daqui. */
export type FeatureKey = 'guide' | 'body-pro';

export interface FeatureDef {
  key: FeatureKey;
  defaultRollout: FeatureRollout; // usado quando não há linha em FeatureFlag
  phase: number; // só informativo no admin
}

export const FEATURES: Record<FeatureKey, FeatureDef> = {
  guide: { key: 'guide', defaultRollout: 'PREMIUM', phase: 14 },
  'body-pro': { key: 'body-pro', defaultRollout: 'PREMIUM', phase: 16 },
};

export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];
export const isFeatureKey = (k: string): k is FeatureKey => k in FEATURES;
