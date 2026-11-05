import 'server-only';
import { db } from '@/lib/db';
import { fromDbDate, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { getEntitlements } from '@/lib/entitlements/server';
import { availableWeeks, getProgram, getWeek, type OcultoProgram, type OcultoWeek } from './content';
import { weekStatus, type SessionLog } from './rules';

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
  }));
  const content = getWeek(progress.week);
  const dream = content?.dreamJournal
    ? await db.ocultoDream.findUnique({ where: { userId_date: { userId, date: toDbDate(today) } }, select: { text: true } })
    : null;
  return {
    program: getProgram(),
    available: availableWeeks(),
    week: progress.week,
    attempt: progress.attempt,
    content,
    todayDream: dream?.text ?? null,
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
