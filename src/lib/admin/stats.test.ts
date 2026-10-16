import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAdminEmail } from '@/lib/env';

vi.mock('server-only', () => ({}));
const { fillDays } = await import('./stats');

describe('backoffice', () => {
  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  it('acesso só para os emails em ADMIN_EMAILS (sem diferença de maiúsculas); vazio = ninguém', () => {
    expect(isAdminEmail('alguem@x.com')).toBe(false);
    process.env.ADMIN_EMAILS = ' Dona@Onda.work , outra@x.com';
    expect(isAdminEmail('dona@onda.work')).toBe(true);
    expect(isAdminEmail('OUTRA@x.com')).toBe(true);
    expect(isAdminEmail('alguem@x.com')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });

  it('dias contínuos do mais recente para o mais antigo, com zeros onde não houve nada', () => {
    const days = fillDays('2026-10-16', 3, {
      signups: new Map([['2026-10-16', 2]]),
      diary: new Map([['2026-10-14', 5]]),
      lessons: new Map([['2026-10-15', { lessons: 7, people: 3 }]]),
    });
    expect(days).toEqual([
      { date: '2026-10-16', signups: 2, diaryPeople: 0, lessons: 0, grimoirePeople: 0 },
      { date: '2026-10-15', signups: 0, diaryPeople: 0, lessons: 7, grimoirePeople: 3 },
      { date: '2026-10-14', signups: 0, diaryPeople: 5, lessons: 0, grimoirePeople: 0 },
    ]);
  });
});
