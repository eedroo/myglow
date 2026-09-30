import { addDays, compareDates, type DateISO } from '@/lib/dates';

/** Regras do Grimório. Puras e testadas: desbloqueio, limite diário, revisão espaçada e quiz. */
export const DAILY_LESSON_LIMIT = 3;
/** Leitner: dias até à próxima revisão para cada caixa (0→1, 1→3, 2→7, 3→21, 4→60). */
export const LEITNER_DAYS = [1, 3, 7, 21, 60] as const;
export const QUIZ_PASS_SCORE = 4;

export type CourseState = 'locked' | 'available' | 'in_progress' | 'completed';
export type LessonState = 'locked' | 'current' | 'completed';

export interface CourseProgressLite {
  completed: boolean;
  lessonsDone: number;
}

/**
 * Cursos obrigatórios em sequência (cada um abre quando o obrigatório anterior está concluído);
 * os livres abrem todos quando todos os obrigatórios estiverem concluídos. Não depende do nível de Glow.
 */
export function courseStates(
  catalog: { slug: string; order: number; required: boolean }[],
  progress: Record<string, CourseProgressLite>,
): Record<string, CourseState> {
  const sorted = [...catalog].sort((a, b) => a.order - b.order);
  const done = (slug: string) => progress[slug]?.completed === true;
  const required = sorted.filter((c) => c.required);
  const allRequiredDone = required.every((c) => done(c.slug));
  const out: Record<string, CourseState> = {};

  const own = (slug: string): CourseState =>
    done(slug) ? 'completed' : (progress[slug]?.lessonsDone ?? 0) > 0 ? 'in_progress' : 'available';

  required.forEach((c, i) => {
    const unlocked = i === 0 || done(required[i - 1]!.slug);
    out[c.slug] = unlocked || done(c.slug) ? own(c.slug) : 'locked';
  });
  for (const c of sorted.filter((x) => !x.required)) {
    out[c.slug] = allRequiredDone || done(c.slug) ? own(c.slug) : 'locked';
  }
  return out;
}

/** Sequencial: concluídas, depois a primeira não concluída é `current`, as restantes `locked`. */
export function lessonStates(lessons: { slug: string }[], done: Set<string>): Record<string, LessonState> {
  const out: Record<string, LessonState> = {};
  let currentAssigned = false;
  for (const l of lessons) {
    if (done.has(l.slug)) out[l.slug] = 'completed';
    else if (!currentAssigned) {
      out[l.slug] = 'current';
      currentAssigned = true;
    } else out[l.slug] = 'locked';
  }
  return out;
}

export function lessonsLeftToday(completedToday: number): number {
  return Math.max(0, DAILY_LESSON_LIMIT - completedToday);
}

/** Lição nova só com limite disponível; rever uma concluída é sempre permitido e não conta. */
export function canStartLesson(i: {
  lessonState: LessonState;
  completedToday: number;
}): { ok: true; mode: 'new' | 'replay' } | { ok: false; reason: 'locked' | 'daily_limit' } {
  if (i.lessonState === 'completed') return { ok: true, mode: 'replay' };
  if (i.lessonState === 'locked') return { ok: false, reason: 'locked' };
  if (lessonsLeftToday(i.completedToday) === 0) return { ok: false, reason: 'daily_limit' };
  return { ok: true, mode: 'new' };
}

/** Certo → caixa seguinte (máx. 4); errado → caixa 0. A data seguinte vem da caixa resultante. */
export function nextReview(box: number, correct: boolean, today: DateISO): { box: number; dueDate: DateISO } {
  const next = correct ? Math.min(box + 1, LEITNER_DAYS.length - 1) : 0;
  return { box: next, dueDate: addDays(today, LEITNER_DAYS[next]!) };
}

export interface ReviewItemLite {
  id: string;
  courseSlug: string;
  lessonSlug: string;
  questionId: string;
  dueDate: DateISO;
  box: number;
}

/**
 * Revisões a mostrar no início de uma lição: as mais atrasadas primeiro, sem perguntas da própria lição.
 * `currentCourse`/`currentLesson` identificam a lição que se vai abrir.
 */
export function pickReviews(due: ReviewItemLite[], currentCourse: string, max = 2, currentLesson?: string): ReviewItemLite[] {
  return due
    .filter((r) => !(r.courseSlug === currentCourse && r.lessonSlug === currentLesson))
    .sort((a, b) => compareDates(a.dueDate, b.dueDate) || a.box - b.box)
    .slice(0, max);
}

export function quizPassed(score: number): boolean {
  return score >= QUIZ_PASS_SCORE;
}
