import { describe, expect, it } from 'vitest';
import { shouldShowPrompt } from './prompt';

describe('shouldShowPrompt', () => {
  it('só a partir do 2.º dia de uso, em "hoje" e sem dispensa', () => {
    const base = { firstDay: '2026-05-05', today: '2026-05-06', isToday: true, dismissed: false };
    expect(shouldShowPrompt(base)).toBe(true);
    expect(shouldShowPrompt({ ...base, firstDay: '2026-05-06' })).toBe(false);
    expect(shouldShowPrompt({ ...base, isToday: false })).toBe(false);
    expect(shouldShowPrompt({ ...base, dismissed: true })).toBe(false);
  });
});
