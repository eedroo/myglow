import { DateTime } from 'luxon';
import type { NotificationKind, NotificationPrefs } from '@prisma/client';
import type { DateISO } from '@/lib/dates';
import type { DayProgress } from '@/lib/daily/progress';
import { addDays } from '@/lib/dates';
import { weekStartOf } from '@/lib/weeks';

/**
 * Regras de envio dos lembretes. Puro: avaliado a cada 15 min; um aviso está devido quando a hora local
 * cai no slot [hora, hora + 15 min) e a secção/período ainda está por fazer.
 */
export const SLOT_MINUTES = 15;

export type NotificationPrefsInput = Pick<
  NotificationPrefs,
  | 'enabled' | 'morningTime' | 'bodyTime' | 'nightTime' | 'morningEnabled' | 'bodyEnabled' | 'nightEnabled'
  | 'weekStart' | 'weekEnd' | 'monthStart' | 'monthEnd' | 'lastCall'
>;

export interface NotificationState {
  day: DayProgress; // hoje
  weekPlanDone: boolean;
  weekReflectionDone: boolean;
  monthPlanDone: boolean;
  monthReflectionDone: boolean;
  /** Reflexões do período anterior (a última chamada de domingo e do dia 1 fecha a semana/mês que acabou). */
  lastWeekReflectionDone: boolean;
  lastMonthReflectionDone: boolean;
}

export interface DueNotification {
  kind: NotificationKind;
  periodKey: string;
}

/** Candidato só por horário (sem estado): permite saltar a DB quando nada pode estar devido. */
export interface NotificationCandidate extends DueNotification {
  date: DateISO; // dia local a que o aviso diz respeito
}

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
};

export const dayKey = (date: DateISO) => date;
export const weekKey = (sunday: DateISO) => `W${sunday}`;
export const monthKey = (date: DateISO) => `M${date.slice(0, 7)}`;
const prevMonthKey = (date: DateISO) => monthKey(DateTime.fromISO(date).minus({ months: 1 }).toISODate()!);

interface Rule {
  kind: NotificationKind;
  time: (p: NotificationPrefsInput) => string;
  offset: number; // minutos depois da hora (evita dois avisos no mesmo instante)
  on: (p: NotificationPrefsInput) => boolean;
  day?: (d: DateTime) => boolean; // dia local em que se aplica
  key: (date: DateISO) => string;
}

const RULES: Rule[] = [
  { kind: 'MORNING', time: (p) => p.morningTime, offset: 0, on: (p) => p.morningEnabled, key: dayKey },
  { kind: 'BODY', time: (p) => p.bodyTime, offset: 0, on: (p) => p.bodyEnabled, key: dayKey },
  { kind: 'NIGHT', time: (p) => p.nightTime, offset: 0, on: (p) => p.nightEnabled, key: dayKey },
  { kind: 'WEEK_START', time: (p) => p.morningTime, offset: 15, on: (p) => p.weekStart, day: (d) => d.weekday === 7, key: weekKey },
  { kind: 'WEEK_END', time: (p) => p.nightTime, offset: 15, on: (p) => p.weekEnd, day: (d) => d.weekday === 6, key: (d) => weekKey(weekStartOf(d)) },
  { kind: 'MONTH_START', time: (p) => p.morningTime, offset: 30, on: (p) => p.monthStart, day: (d) => d.day === 1, key: monthKey },
  { kind: 'MONTH_END', time: (p) => p.nightTime, offset: 30, on: (p) => p.monthEnd, day: (d) => d.day === d.daysInMonth, key: monthKey },
  // Última chamada: no último dia da janela do Glow, à noite (+15/+30 min para não coincidir com os outros).
  { kind: 'WEEK_PLAN_LAST', time: (p) => p.nightTime, offset: 15, on: (p) => p.lastCall && p.weekStart, day: (d) => d.weekday === 2, key: (d) => weekKey(weekStartOf(d)) },
  { kind: 'WEEK_REFLECTION_LAST', time: (p) => p.nightTime, offset: 15, on: (p) => p.lastCall && p.weekEnd, day: (d) => d.weekday === 7, key: (d) => weekKey(addDays(d, -7)) },
  { kind: 'MONTH_PLAN_LAST', time: (p) => p.nightTime, offset: 30, on: (p) => p.lastCall && p.monthStart, day: (d) => d.day === 7, key: monthKey },
  { kind: 'MONTH_REFLECTION_LAST', time: (p) => p.nightTime, offset: 30, on: (p) => p.lastCall && p.monthEnd, day: (d) => d.day === 1, key: prevMonthKey },
];

/** Avisos cujo horário cai no slot actual (ainda sem olhar ao que está feito). */
export function dueCandidates(now: Date, tz: string, prefs: NotificationPrefsInput): NotificationCandidate[] {
  if (!prefs.enabled) return [];
  const local = DateTime.fromJSDate(now, { zone: tz });
  const out: NotificationCandidate[] = [];
  for (const r of RULES) {
    if (!r.on(prefs)) continue;
    // Desfaz o desfasamento: o dia e a hora "base" do aviso.
    const base = local.minus({ minutes: r.offset });
    const slot = Math.floor((base.hour * 60 + base.minute) / SLOT_MINUTES) * SLOT_MINUTES;
    if (slot !== minutesOf(r.time(prefs))) continue;
    if (r.day && !r.day(base)) continue;
    const date = base.toISODate()!;
    out.push({ kind: r.kind, periodKey: r.key(date), date });
  }
  return out;
}

function pending(kind: NotificationKind, s: NotificationState): boolean {
  switch (kind) {
    case 'MORNING': return !s.day.morning;
    case 'BODY': return !s.day.body;
    case 'NIGHT': return !s.day.night;
    case 'WEEK_START': return !s.weekPlanDone;
    case 'WEEK_END': return !s.weekReflectionDone;
    case 'MONTH_START': return !s.monthPlanDone;
    case 'MONTH_END': return !s.monthReflectionDone;
    case 'WEEK_PLAN_LAST': return !s.weekPlanDone;
    case 'WEEK_REFLECTION_LAST': return !s.lastWeekReflectionDone;
    case 'MONTH_PLAN_LAST': return !s.monthPlanDone;
    case 'MONTH_REFLECTION_LAST': return !s.lastMonthReflectionDone;
  }
}

/** Avisos devidos agora: no slot certo e só se ainda houver algo por fazer. */
export function dueNotifications(now: Date, tz: string, prefs: NotificationPrefsInput, state: NotificationState): DueNotification[] {
  return dueCandidates(now, tz, prefs)
    .filter((c) => pending(c.kind, state))
    .map(({ kind, periodKey }) => ({ kind, periodKey }));
}
