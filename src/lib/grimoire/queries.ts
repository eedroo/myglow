import 'server-only';
import { cookies } from 'next/headers';
import type { Locale } from '@prisma/client';
import { db } from '@/lib/db';
import { fromDbDate, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import type { MagicIconName } from '@/lib/icons';
import { dbToAppLocale, type AppLocale } from '@/i18n/locales';
import { getCatalog, getCourse, resolveContentLocale } from './content';
import {
  canStartLesson, courseStates, focusCourse, lessonStates, lessonsLeftToday, pickReviews,
  type CourseState, type LessonState, type ReviewItemLite,
} from './rules';
import type { Course, GrimoireLocale, Lesson, QuizQuestion } from './schema';

/** Leituras do Grimório para as páginas (mapa, leitor, quiz, perfil). Só lêem; as mutações estão em actions. */

export const READ_PT_COOKIE = 'mg_grimoire_pt';

export interface ContentPrefs {
  userLocale: AppLocale;
  readInPortuguese: boolean;
}

/** Preferências de conteúdo do pedido actual: língua do utilizador + cookie "ler em português". */
export function contentPrefsFor(locale: Locale): ContentPrefs {
  return { userLocale: dbToAppLocale(locale), readInPortuguese: cookies().get(READ_PT_COOKIE)?.value === '1' };
}

export interface PublishedCourse {
  entry: { slug: string; order: number; required: boolean };
  locale: GrimoireLocale;
  course: Course;
}

/** Cursos publicados na língua resolvida do utilizador (os sem ficheiro nessa língua não aparecem). */
export function publishedCourses(p: ContentPrefs): PublishedCourse[] {
  return getCatalog().flatMap((entry) => {
    const locale = resolveContentLocale(p.userLocale, p.readInPortuguese, entry.locales);
    const course = locale ? getCourse(entry.slug, locale) : null;
    return course && locale ? [{ entry, locale, course }] : [];
  });
}

interface UserProgress {
  lessonsDone: Map<string, Set<string>>; // curso → lições concluídas
  courses: Map<string, { completedAt: Date | null; bestScore: number | null; quizAttempts: number }>;
  completedToday: number;
  lastLessonCourse: string | null; // curso da última lição concluída
}

async function loadProgress(userId: string, today: DateISO): Promise<UserProgress> {
  const [lessons, courses, completedToday] = await Promise.all([
    db.lessonProgress.findMany({ where: { userId }, select: { courseSlug: true, lessonSlug: true, completedAt: true } }),
    db.courseProgress.findMany({ where: { userId }, select: { courseSlug: true, completedAt: true, bestScore: true, quizAttempts: true } }),
    db.lessonProgress.count({ where: { userId, completedDate: toDbDate(today) } }),
  ]);
  const lessonsDone = new Map<string, Set<string>>();
  let last: (typeof lessons)[number] | null = null;
  for (const l of lessons) {
    if (!last || l.completedAt > last.completedAt) last = l;
    if (!lessonsDone.has(l.courseSlug)) lessonsDone.set(l.courseSlug, new Set());
    lessonsDone.get(l.courseSlug)!.add(l.lessonSlug);
  }
  return { lessonsDone, courses: new Map(courses.map((c) => [c.courseSlug, c])), completedToday, lastLessonCourse: last?.courseSlug ?? null };
}

function statesFor(published: PublishedCourse[], progress: UserProgress) {
  const catalog = getCatalog().map(({ slug, order, required }) => ({ slug, order, required }));
  return courseStates(
    catalog,
    Object.fromEntries(
      catalog.map((c) => [
        c.slug,
        { completed: !!progress.courses.get(c.slug)?.completedAt, lessonsDone: progress.lessonsDone.get(c.slug)?.size ?? 0 },
      ]),
    ),
  );
}

export interface MapLesson {
  slug: string;
  title: string;
  minutes: number;
  state: LessonState;
}

export interface MapCourse {
  slug: string;
  order: number;
  required: boolean;
  state: CourseState;
  title: string;
  subtitle: string;
  icon: MagicIconName;
  badge: { name: string; icon: MagicIconName; description: string };
  lessons: MapLesson[];
  lessonsDone: number;
  quizUnlocked: boolean;
  completed: boolean;
}

export interface GrimoireState {
  comingSoon: boolean; // nenhum curso na língua do utilizador (EN sem "ler em português")
  today: DateISO;
  lessonsToday: number;
  lessonsLeft: number;
  courses: MapCourse[];
  requiredDone: boolean;
  badgesEarned: number;
  /** Curso para onde o mapa faz scroll ao abrir (onde a pessoa ficou). */
  focusCourse: string | null;
}

export async function getGrimoireState(userId: string, tz: string, prefs: ContentPrefs): Promise<GrimoireState> {
  const today = todayInTz(tz);
  const published = publishedCourses(prefs);
  const progress = await loadProgress(userId, today);
  const states = statesFor(published, progress);

  const courses: MapCourse[] = published.map(({ entry, course }) => {
    const done = progress.lessonsDone.get(entry.slug) ?? new Set<string>();
    const lessonStateMap = lessonStates(course.lessons, done);
    const locked = states[entry.slug] === 'locked';
    const lessonsDone = course.lessons.filter((l) => done.has(l.slug)).length;
    return {
      slug: entry.slug,
      order: entry.order,
      required: entry.required,
      state: states[entry.slug] ?? 'locked',
      title: course.title,
      subtitle: course.subtitle,
      icon: course.icon,
      badge: course.badge,
      lessons: course.lessons.map((l) => ({
        slug: l.slug,
        title: l.title,
        minutes: l.minutes,
        state: locked && lessonStateMap[l.slug] === 'current' ? 'locked' : lessonStateMap[l.slug]!,
      })),
      lessonsDone,
      quizUnlocked: !locked && lessonsDone === course.lessons.length,
      completed: !!progress.courses.get(entry.slug)?.completedAt,
    };
  });

  return {
    comingSoon: published.length === 0 && getCatalog().length > 0,
    today,
    lessonsToday: progress.completedToday,
    lessonsLeft: lessonsLeftToday(progress.completedToday),
    courses,
    requiredDone: getCatalog().filter((c) => c.required).every((c) => !!progress.courses.get(c.slug)?.completedAt),
    badgesEarned: courses.filter((c) => c.completed).length,
    focusCourse: focusCourse(courses, progress.lastLessonCourse),
  };
}

/** Para os lembretes (sem pedido HTTP, logo sem o cookie "ler em português"): o que há por fazer no dia `date`. */
export interface GrimoireDayStatus {
  lessonsToday: number;
  /** Lições novas que ainda se podem fazer hoje (limite diário e lições por fazer nos cursos abertos). */
  lessonsLeft: number;
  /** Um curso aberto tem todas as lições feitas e falta o quiz. */
  quizPending: boolean;
  /** A próxima lição do curso em foco (o mesmo do mapa), com ganchos tirados da própria lição para os avisos. */
  next?: { course: string; lesson: string; minutes: number; hooks: string[] };
}

/** Primeira frase de um texto (até ao primeiro ponto final seguido de espaço). */
const firstSentence = (text: string) => text.split(/(?<=[.!?])\s/)[0]!.trim();

/**
 * Frases da lição que servem de gancho num aviso: o `hook` escrito para isso, a pergunta de reflexão e a primeira
 * frase do "sabias que". Os títulos dos cards ("Sem medo") só entram se não houver mais nada: soltos dizem pouco.
 */
function lessonHooks(lesson: Lesson): string[] {
  const hooks = lesson.hook ? [lesson.hook] : [];
  for (const c of lesson.cards) if (c.type === 'reflection') hooks.push(c.prompt);
  for (const c of lesson.cards) if (c.type === 'didYouKnow') hooks.push(firstSentence(c.body));
  if (hooks.length) return hooks;
  return lesson.cards.flatMap((c) => (c.type === 'concept' || c.type === 'example' ? [c.title] : []));
}

export async function getGrimoireDayStatus(userId: string, locale: Locale, date: DateISO): Promise<GrimoireDayStatus> {
  const published = publishedCourses({ userLocale: dbToAppLocale(locale), readInPortuguese: false });
  if (!published.length) return { lessonsToday: 0, lessonsLeft: 0, quizPending: false };
  const progress = await loadProgress(userId, date);
  const states = statesFor(published, progress);
  let open = 0;
  let quizPending = false;
  const focus = focusCourse(
    published.map(({ entry }) => ({ slug: entry.slug, state: states[entry.slug] ?? 'locked' })),
    progress.lastLessonCourse,
  );
  let next: GrimoireDayStatus['next'];
  for (const { entry, course } of published) {
    const state = states[entry.slug];
    if (state === 'locked' || state === 'completed') continue;
    const done = progress.lessonsDone.get(entry.slug) ?? new Set<string>();
    const todo = course.lessons.filter((l) => !done.has(l.slug)).length;
    open += todo;
    if (todo === 0) quizPending = true;
    const lesson = entry.slug === focus ? course.lessons.find((l) => !done.has(l.slug)) : undefined;
    if (lesson) next = { course: course.title, lesson: lesson.title, minutes: lesson.minutes, hooks: lessonHooks(lesson) };
  }
  return {
    lessonsToday: progress.completedToday,
    lessonsLeft: Math.min(open, lessonsLeftToday(progress.completedToday)),
    quizPending,
    ...(next && { next }),
  };
}

export type GrimoireNotice = 'locked' | 'daily_limit' | 'course_locked' | 'not_found';

export interface LessonPlayerData {
  courseSlug: string;
  courseTitle: string;
  lesson: Lesson;
  mode: 'new' | 'replay';
  reviews: { itemId: string; question: QuizQuestion }[];
  nextLesson: string | null;
  lessonsLeft: number;
}

async function contextFor(userId: string, courseSlug: string, tz: string, prefs: ContentPrefs) {
  const published = publishedCourses(prefs).find((p) => p.entry.slug === courseSlug);
  if (!published) return { ok: false as const, notice: 'not_found' as const };
  const today = todayInTz(tz);
  const progress = await loadProgress(userId, today);
  const state = statesFor(publishedCourses(prefs), progress)[courseSlug];
  if (!state || state === 'locked') return { ok: false as const, notice: 'course_locked' as const };
  const done = progress.lessonsDone.get(courseSlug) ?? new Set<string>();
  return { ok: true as const, published, today, progress, done };
}

/** Dados do leitor ou o motivo para voltar ao mapa. Inclui até 2 revisões devidas (de outras lições). */
export async function getLessonPlayerData(
  userId: string,
  courseSlug: string,
  lessonSlug: string,
  tz: string,
  prefs: ContentPrefs,
): Promise<{ data: LessonPlayerData } | { notice: GrimoireNotice }> {
  const ctx = await contextFor(userId, courseSlug, tz, prefs);
  if (!ctx.ok) return { notice: ctx.notice };
  const { published, today, progress, done } = ctx;
  const lessons = published.course.lessons;
  const idx = lessons.findIndex((l) => l.slug === lessonSlug);
  if (idx < 0) return { notice: 'not_found' };

  const state = lessonStates(lessons, done)[lessonSlug]!;
  const can = canStartLesson({ lessonState: state, completedToday: progress.completedToday });
  if (!can.ok) return { notice: can.reason };

  const dueRows = await db.reviewItem.findMany({
    where: { userId, dueDate: { lte: toDbDate(today) } },
    orderBy: { dueDate: 'asc' },
    take: 20,
  });
  const due: ReviewItemLite[] = dueRows.map((r) => ({ ...r, dueDate: fromDbDate(r.dueDate) }));
  const byCourse = new Map(publishedCourses(prefs).map((p) => [p.entry.slug, p.course]));
  const reviews = pickReviews(due, courseSlug, 2, lessonSlug).flatMap((r) => {
    const q = byCourse.get(r.courseSlug)?.lessons.find((l) => l.slug === r.lessonSlug)?.review.find((x) => x.id === r.questionId);
    return q ? [{ itemId: r.id, question: q }] : [];
  });

  return {
    data: {
      courseSlug,
      courseTitle: published.course.title,
      lesson: lessons[idx]!,
      mode: can.mode,
      reviews,
      nextLesson: lessons[idx + 1]?.slug ?? null,
      lessonsLeft: lessonsLeftToday(progress.completedToday),
    },
  };
}

export interface QuizData {
  courseSlug: string;
  courseTitle: string;
  questions: QuizQuestion[];
  badge: Course['badge'];
  completed: boolean;
}

export async function getQuizData(
  userId: string,
  courseSlug: string,
  tz: string,
  prefs: ContentPrefs,
): Promise<{ data: QuizData } | { notice: GrimoireNotice }> {
  const ctx = await contextFor(userId, courseSlug, tz, prefs);
  if (!ctx.ok) return { notice: ctx.notice };
  const { published, progress, done } = ctx;
  if (!published.course.lessons.every((l) => done.has(l.slug))) return { notice: 'locked' };
  return {
    data: {
      courseSlug,
      courseTitle: published.course.title,
      questions: published.course.quiz,
      badge: published.course.badge,
      completed: !!progress.courses.get(courseSlug)?.completedAt,
    },
  };
}

export interface BadgeView {
  courseSlug: string;
  courseTitle: string;
  name: string;
  icon: MagicIconName;
  description: string;
  earnedAt: string | null; // ISO
}

/** Emblemas dos cursos publicados: conquistados (com data) e por conquistar. */
export async function getBadges(userId: string, prefs: ContentPrefs): Promise<BadgeView[]> {
  const rows = await db.courseProgress.findMany({ where: { userId, completedAt: { not: null } }, select: { courseSlug: true, completedAt: true } });
  const earned = new Map(rows.map((r) => [r.courseSlug, r.completedAt!]));
  return publishedCourses(prefs).map(({ entry, course }) => ({
    courseSlug: entry.slug,
    courseTitle: course.title,
    name: course.badge.name,
    icon: course.badge.icon,
    description: course.badge.description,
    earnedAt: earned.get(entry.slug)?.toISOString() ?? null,
  }));
}
