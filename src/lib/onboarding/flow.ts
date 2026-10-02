/** Fluxo de entrada (F10): registo → nascimento → apresentação → hoje. Puro. */
export type OnboardingStep = 'birth' | 'welcome' | 'done';

export function nextOnboardingStep(u: { onboardedAt: Date | null; welcomeSeenAt: Date | null }): OnboardingStep {
  if (!u.onboardedAt) return 'birth';
  if (!u.welcomeSeenAt) return 'welcome';
  return 'done';
}
