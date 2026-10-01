import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCatalog, getCourse } from './content';

/** Estado do Grimório para os lembretes, com o conteúdo real e a DB simulada. */
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined }) }));

const data = {
  lessons: [] as { courseSlug: string; lessonSlug: string }[],
  courses: [] as { courseSlug: string; completedAt: Date | null; bestScore: number | null; quizAttempts: number }[],
  today: 0,
};

vi.mock('@/lib/db', () => ({
  db: {
    lessonProgress: { findMany: vi.fn(async () => data.lessons), count: vi.fn(async () => data.today) },
    courseProgress: { findMany: vi.fn(async () => data.courses) },
  },
}));

const { getGrimoireDayStatus } = await import('./queries');

const first = getCatalog()[0]!.slug;
const firstLessons = getCourse(first, 'pt-BR')!.lessons.map((l) => ({ courseSlug: first, lessonSlug: l.slug }));

describe('getGrimoireDayStatus', () => {
  beforeEach(() => {
    data.lessons = [];
    data.courses = [];
    data.today = 0;
  });

  it('conta nova: 3 lições liberadas hoje', async () => {
    expect(await getGrimoireDayStatus('u1', 'PT_BR', '2026-10-01')).toEqual({ lessonsToday: 0, lessonsLeft: 3, quizPending: false });
  });

  it('2 lições feitas hoje → falta 1', async () => {
    data.lessons = firstLessons.slice(0, 2);
    data.today = 2;
    expect(await getGrimoireDayStatus('u1', 'PT_PT', '2026-10-01')).toMatchObject({ lessonsToday: 2, lessonsLeft: 1 });
  });

  it('todas as lições do curso 1 feitas e quiz por fazer: sem lições novas (curso 2 fechado), quiz pendente', async () => {
    data.lessons = firstLessons;
    expect(await getGrimoireDayStatus('u1', 'PT_BR', '2026-10-01')).toEqual({ lessonsToday: 0, lessonsLeft: 0, quizPending: true });
  });

  it('curso 1 concluído → o curso 2 abre', async () => {
    data.lessons = firstLessons;
    data.courses = [{ courseSlug: first, completedAt: new Date(), bestScore: 5, quizAttempts: 1 }];
    expect(await getGrimoireDayStatus('u1', 'PT_BR', '2026-10-01')).toMatchObject({ lessonsLeft: 3, quizPending: false });
  });

  it('inglês sem conteúdo → nada a lembrar', async () => {
    expect(await getGrimoireDayStatus('u1', 'EN', '2026-10-01')).toEqual({ lessonsToday: 0, lessonsLeft: 0, quizPending: false });
  });
});
