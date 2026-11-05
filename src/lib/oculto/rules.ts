import { compareDates, type DateISO } from '@/lib/dates';
import type { OcultoWeek } from './content';

/** Grimório Oculto: regras do treino. Puro. */

export interface SessionLog {
  day: number;
  date: DateISO;
  plannedSec: number;
  actualSec: number;
  concentration: number;
  difficulty: string | null;
  notes: string | null;
}

export const DAYS_PER_WEEK = 5;
const filled = (v: string | null | undefined) => typeof v === 'string' && v.trim() !== '';

/**
 * O que a pessoa pode fazer hoje na semana actual: a próxima sessão (uma por dia, por ordem), ou nada se já praticou
 * hoje ou se as 5 estão feitas. A avaliação abre com as 5 sessões, ou passados 7 dias com pelo menos uma.
 */
export function weekStatus(i: { logs: SessionLog[]; today: DateISO; daysSinceStart: number }): {
  done: number[];
  next: number | null;
  doneToday: boolean;
  canPractice: boolean;
  reviewReady: boolean;
} {
  const done = [...new Set(i.logs.map((l) => l.day))].sort((a, b) => a - b);
  const doneToday = i.logs.some((l) => compareDates(l.date, i.today) === 0);
  const next = Array.from({ length: DAYS_PER_WEEK }, (_, k) => k + 1).find((d) => !done.includes(d)) ?? null;
  return {
    done,
    next,
    doneToday,
    canPractice: next !== null && !doneToday,
    reviewReady: done.length >= DAYS_PER_WEEK || (i.daysSinceStart >= 7 && done.length >= 1),
  };
}

export type ReviewReason = 'sessions' | 'goal' | 'diary' | 'focus';
export type ReviewLevel = 'beginner' | 'consistent' | 'consolidated';

export interface WeekReview {
  result: 'ADVANCE' | 'REPEAT';
  level: ReviewLevel;
  /** O que faltou (só em REPEAT). */
  reasons: ReviewReason[];
  metrics: { sessions: number; goalSec: number; bestSec: number; avgConcentration: number | null; diaryCount: number };
}

/**
 * Avaliação automática da semana, a partir do diário do treino:
 * - sessões: pelo menos 4 das 5;
 * - tempo: a melhor sessão chega a 80 % do tempo alvo mais alto da semana;
 * - diário: pelo menos 4 registos com dificuldade ou observações escritas;
 * - foco: concentração média abaixo de 4 e sem melhoria da primeira para a última sessão pede repetição.
 * Sem nada a faltar: avança (consolidado com concentração média 7 ou mais). Os critérios podem vir da semana.
 */
export function evaluateWeek(week: Pick<OcultoWeek, 'sessions' | 'criteria'>, logs: SessionLog[]): WeekReview {
  const minSessions = week.criteria?.minSessions ?? 4;
  const goalRatio = week.criteria?.goalRatio ?? 0.8;
  const minDiary = week.criteria?.minDiary ?? 4;
  const byDay = [...logs].sort((a, b) => a.day - b.day);
  const goalSec = Math.max(...week.sessions.map((s) => s.mainMinutes * 60));
  const bestSec = byDay.reduce((m, l) => Math.max(m, l.actualSec), 0);
  const avg = byDay.length ? Math.round((byDay.reduce((s, l) => s + l.concentration, 0) / byDay.length) * 10) / 10 : null;
  const diaryCount = byDay.filter((l) => filled(l.difficulty) || filled(l.notes)).length;
  const sessions = new Set(byDay.map((l) => l.day)).size;

  const reasons: ReviewReason[] = [];
  if (sessions < minSessions) reasons.push('sessions');
  if (bestSec < goalSec * goalRatio) reasons.push('goal');
  if (diaryCount < Math.min(minDiary, minSessions)) reasons.push('diary');
  if (avg !== null && avg < 4 && byDay.length >= 2 && byDay[byDay.length - 1]!.concentration <= byDay[0]!.concentration) reasons.push('focus');

  const result = reasons.length ? 'REPEAT' : 'ADVANCE';
  const level: ReviewLevel = result === 'REPEAT' ? 'beginner' : avg !== null && avg >= 7 ? 'consolidated' : 'consistent';
  return { result, level, reasons, metrics: { sessions, goalSec, bestSec, avgConcentration: avg, diaryCount } };
}

/** Próxima semana do programa (ou null no fim / se ainda não existe). */
export function nextWeek(current: number, available: number[]): number | null {
  return available.find((w) => w > current) ?? null;
}
