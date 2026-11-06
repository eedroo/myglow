import 'server-only';
import { db } from '@/lib/db';
import { fromDbDate, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { getEntitlements } from '@/lib/entitlements/server';
import { availableWeeks, getProgram, getWeek, type OcultoProgram, type OcultoWeek } from './content';
import { weekStatus, type SessionLog } from './rules';
import { parseStrokes, type Strokes } from './glyph';

/** Grimório Oculto: só com o recurso 'oculto' (liberado pelo admin). */
export async function hasOculto(userId: string): Promise<boolean> {
  return !!(await getEntitlements(userId)).features.oculto;
}

const daysBetween = (a: DateISO, b: DateISO) => Math.round((toDbDate(b).getTime() - toDbDate(a).getTime()) / 86_400_000);

export interface OcultoState {
  program: OcultoProgram;
  available: number[];
  week: number;
  attempt: number;
  content: OcultoWeek | null;
  logs: SessionLog[];
  status: ReturnType<typeof weekStatus>;
  today: DateISO;
  /** Avaliações já feitas (todas as semanas), mais recentes primeiro. */
  reviews: { week: number; attempt: number; result: 'ADVANCE' | 'REPEAT'; createdAt: string }[];
  /** Avaliação já feita desta semana e tentativa (ex.: avançou na última semana escrita e espera pela seguinte). */
  currentReview: { result: 'ADVANCE' | 'REPEAT'; reasons: string[] } | null;
  /** Sonho de hoje (só nas semanas com `dreamJournal`). */
  todayDream: string | null;
  /** Crença sorteada desta semana e tentativa (índice em `content.beliefs`), ou null até lançar o dado. */
  belief: number | null;
  /** Alfabeto do Desejo aberto (a semana actual já passou pela primeira semana com `alphabet`). */
  alphabetOpen: boolean;
  glyphs: OcultoGlyphView[];
  /** Paradigma pessoal aberto (a semana actual já passou pela primeira semana com `paradigm`). */
  paradigmOpen: boolean;
  paradigm: OcultoParadigmView | null;
}

export interface OcultoGlyphView {
  id: string;
  name: string;
  meaning: string | null;
  strokes: Strokes;
}

export interface OcultoParadigmView {
  name: string;
  premises: string;
  symbols: string[];
  practices: string;
  limits: string;
}

/** Primeira semana escrita com uma marca (alfabeto, paradigma…), ou null se ainda não há. */
export function firstWeekWith(available: number[], flag: 'alphabet' | 'paradigm'): number | null {
  return available.find((w) => getWeek(w)?.[flag]) ?? null;
}

/** Primeira semana escrita com o Alfabeto do Desejo (null se ainda não há). */
export function alphabetWeek(available: number[]): number | null {
  return firstWeekWith(available, 'alphabet');
}

/** Estado do treino (cria o progresso na primeira visita). null sem o recurso. */
export async function getOculto(userId: string): Promise<OcultoState | null> {
  if (!(await hasOculto(userId))) return null;
  const user = await db.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  if (!user) return null;
  const today = todayInTz(user.timezone);
  const progress = await db.ocultoProgress.upsert({ where: { userId }, create: { userId }, update: {} });
  const [rows, reviews] = await Promise.all([
    db.ocultoSession.findMany({ where: { userId, week: progress.week, attempt: progress.attempt }, orderBy: { day: 'asc' } }),
    db.ocultoReview.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ]);
  const logs: SessionLog[] = rows.map((r) => ({
    day: r.day, date: fromDbDate(r.date), plannedSec: r.plannedSec, actualSec: r.actualSec, concentration: r.concentration,
    difficulty: r.difficulty, notes: r.notes, dream: r.dream,
    experience: r.experience, interpretation: r.interpretation, evidence: r.evidence,
  }));
  const content = getWeek(progress.week);
  const dream = content?.dreamJournal
    ? await db.ocultoDream.findUnique({ where: { userId_date: { userId, date: toDbDate(today) } }, select: { text: true } })
    : null;
  const available = availableWeeks();
  const firstAlphabet = alphabetWeek(available);
  const alphabetOpen = firstAlphabet !== null && progress.week >= firstAlphabet;
  const glyphs = alphabetOpen
    ? await db.ocultoGlyph.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, meaning: true, strokes: true } })
    : [];
  const firstParadigm = firstWeekWith(available, 'paradigm');
  const paradigmOpen = firstParadigm !== null && progress.week >= firstParadigm;
  const paradigm = paradigmOpen ? await db.ocultoParadigm.findUnique({ where: { userId } }) : null;
  return {
    program: getProgram(),
    available,
    week: progress.week,
    attempt: progress.attempt,
    content,
    todayDream: dream?.text ?? null,
    belief: content?.beliefs && progress.belief !== null && progress.belief < content.beliefs.length ? progress.belief : null,
    alphabetOpen,
    paradigmOpen,
    paradigm: paradigm && {
      name: paradigm.name ?? '',
      premises: paradigm.premises ?? '',
      // Só símbolos que ainda existem no alfabeto.
      symbols: paradigm.symbols.filter((id) => glyphs.some((g) => g.id === id)),
      practices: paradigm.practices ?? '',
      limits: paradigm.limits ?? '',
    },
    glyphs: glyphs.map((g) => ({ id: g.id, name: g.name, meaning: g.meaning, strokes: parseStrokes(g.strokes) })),
    logs,
    status: weekStatus({ logs, today, daysSinceStart: daysBetween(todayInTz(user.timezone, progress.weekStartedAt), today) }),
    today,
    reviews: reviews.map((r) => ({ week: r.week, attempt: r.attempt, result: r.result, createdAt: r.createdAt.toISOString() })),
    currentReview: (() => {
      const r = reviews.find((x) => x.week === progress.week && x.attempt === progress.attempt);
      return r ? { result: r.result, reasons: r.reasons } : null;
    })(),
  };
}
