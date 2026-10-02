/** Cartão "Primeiros passos" (F10), calculado a partir dos dados reais. Puro. */
export type FirstStepKey = 'intention' | 'lesson' | 'week' | 'install';

export interface FirstStep {
  key: FirstStepKey;
  done: boolean;
  href: string;
}

export function computeFirstSteps(i: {
  hasIntentionToday: boolean;
  lessonsCompleted: number;
  hasWeekIntention: boolean;
  hasPushOrDismissed: boolean;
}): { steps: FirstStep[]; allDone: boolean } {
  const steps: FirstStep[] = [
    { key: 'intention', done: i.hasIntentionToday, href: '/today#intencao' },
    { key: 'lesson', done: i.lessonsCompleted > 0, href: '/grimoire' },
    { key: 'week', done: i.hasWeekIntention, href: '/week' },
    { key: 'install', done: i.hasPushOrDismissed, href: '/settings#notifications' },
  ];
  return { steps, allDone: steps.every((s) => s.done) };
}
