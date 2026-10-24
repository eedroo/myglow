/** Fluxo de entrada: registo → nascimento → hoje (F11: o guia interactivo começa em /today). Puro. */
export type OnboardingStep = 'birth' | 'done';

export function nextOnboardingStep(u: { onboardedAt: Date | null }): OnboardingStep {
  return u.onboardedAt ? 'done' : 'birth';
}
