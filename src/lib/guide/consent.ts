import { guideConsentVersion } from '@/lib/env';

/** F14: consentimento do Guia válido = dado e na versão actual do texto (mudar a versão pede novo consentimento). */
export function hasGuideConsent(u: { guideConsentAt: Date | null; guideConsentVersion: string | null }): boolean {
  return u.guideConsentAt !== null && u.guideConsentVersion === guideConsentVersion();
}
