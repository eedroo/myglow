import { describe, expect, it } from 'vitest';
import {
  canStartLesson, courseStates, lessonStates, lessonsLeftToday, nextReview, pickReviews, quizPassed, type ReviewItemLite,
} from './rules';

const CATALOG = [
  { slug: 'c1', order: 1, required: true },
  { slug: 'c2', order: 2, required: true },
  { slug: 'c3', order: 3, required: true },
  { slug: 'c4', order: 4, required: false },
  { slug: 'c5', order: 5, required: false },
];
const done = { completed: true, lessonsDone: 6 };

describe('courseStates', () => {
  it('nada feito → 1 disponível, resto bloqueado', () => {
    expect(courseStates(CATALOG, {})).toEqual({ c1: 'available', c2: 'locked', c3: 'locked', c4: 'locked', c5: 'locked' });
  });

  it('1 concluído → 2 disponível; 1 a meio → in_progress', () => {
    expect(courseStates(CATALOG, { c1: done })).toMatchObject({ c1: 'completed', c2: 'available', c3: 'locked', c4: 'locked' });
    expect(courseStates(CATALOG, { c1: { completed: false, lessonsDone: 2 } }).c1).toBe('in_progress');
  });

  it('1–3 concluídos → 4 e 5 disponíveis (escolha livre)', () => {
    expect(courseStates(CATALOG, { c1: done, c2: done, c3: done })).toMatchObject({ c4: 'available', c5: 'available' });
  });
});

describe('lessonStates', () => {
  it('a primeira não concluída é current, as seguintes locked', () => {
    const lessons = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }, { slug: 'd' }];
    expect(lessonStates(lessons, new Set(['a']))).toEqual({ a: 'completed', b: 'current', c: 'locked', d: 'locked' });
    expect(lessonStates(lessons, new Set())).toMatchObject({ a: 'current', b: 'locked' });
  });
});

describe('limite diário', () => {
  it('3 feitas hoje → daily_limit; rever uma concluída continua possível', () => {
    expect(lessonsLeftToday(1)).toBe(2);
    expect(lessonsLeftToday(5)).toBe(0);
    expect(canStartLesson({ lessonState: 'current', completedToday: 3 })).toEqual({ ok: false, reason: 'daily_limit' });
    expect(canStartLesson({ lessonState: 'completed', completedToday: 3 })).toEqual({ ok: true, mode: 'replay' });
    expect(canStartLesson({ lessonState: 'current', completedToday: 2 })).toEqual({ ok: true, mode: 'new' });
    expect(canStartLesson({ lessonState: 'locked', completedToday: 0 })).toEqual({ ok: false, reason: 'locked' });
  });
});

describe('nextReview (Leitner)', () => {
  it('certo sobe de caixa; errado volta a 0; caixa 4 mantém-se', () => {
    expect(nextReview(0, true, '2026-10-01')).toEqual({ box: 1, dueDate: '2026-10-04' });
    expect(nextReview(3, false, '2026-10-01')).toEqual({ box: 0, dueDate: '2026-10-02' });
    expect(nextReview(4, true, '2026-10-01')).toEqual({ box: 4, dueDate: '2026-11-30' });
  });
});

describe('pickReviews', () => {
  const item = (id: string, lessonSlug: string, dueDate: string, box = 0): ReviewItemLite => ({
    id, courseSlug: 'c1', lessonSlug, questionId: 'r1', dueDate, box,
  });
  it('mais atrasadas primeiro, sem a lição actual, máx. 2', () => {
    const due = [item('x', 'a', '2026-10-03'), item('y', 'b', '2026-09-20'), item('z', 'c', '2026-09-25'), item('w', 'd', '2026-09-10')];
    expect(pickReviews(due, 'c1', 2, 'd').map((r) => r.id)).toEqual(['y', 'z']);
  });
});

describe('quizPassed', () => {
  it('aprova com 4/5', () => {
    expect(quizPassed(4)).toBe(true);
    expect(quizPassed(5)).toBe(true);
    expect(quizPassed(3)).toBe(false);
  });
});
