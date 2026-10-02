import { describe, expect, it } from 'vitest';
import { computeFirstSteps } from './firstSteps';

const none = { hasIntentionToday: false, lessonsCompleted: 0, hasWeekIntention: false, hasPushOrDismissed: false };

describe('computeFirstSteps', () => {
  it('nada feito → 4 passos por fazer', () => {
    const r = computeFirstSteps(none);
    expect(r.steps.map((s) => s.key)).toEqual(['intention', 'lesson', 'week', 'install']);
    expect(r.steps.every((s) => !s.done)).toBe(true);
    expect(r.allDone).toBe(false);
  });

  it('uma lição marca o passo lesson', () => {
    const r = computeFirstSteps({ ...none, lessonsCompleted: 1 });
    expect(r.steps.find((s) => s.key === 'lesson')!.done).toBe(true);
    expect(r.allDone).toBe(false);
  });

  it('tudo feito → allDone', () => {
    expect(computeFirstSteps({ hasIntentionToday: true, lessonsCompleted: 3, hasWeekIntention: true, hasPushOrDismissed: true }).allDone).toBe(true);
  });
});
