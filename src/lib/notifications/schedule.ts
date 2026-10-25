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
  | 'weekStart' | 'weekEnd' | 'monthStart' | 'monthEnd' | 'lastCall' | 'grimoireEnabled' | 'grimoireTime'
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
  /** Grimório no dia: lições novas que ainda dá para fazer hoje e quiz por fazer num curso aberto. */
  grimoire: { lessonsLeft: number; quizPending: boolean; next?: { lesson: string; minutes: number; hooks: string[] } };
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
  // Grimório: convite à hora escolhida; última chamada 45 min depois da noite (a seguir às outras).
  { kind: 'GRIMOIRE', time: (p) => p.grimoireTime, offset: 0, on: (p) => p.grimoireEnabled, key: dayKey },
  { kind: 'GRIMOIRE_LAST', time: (p) => p.nightTime, offset: 45, on: (p) => p.lastCall && p.grimoireEnabled, key: dayKey },
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
    case 'GRIMOIRE': return s.grimoire.lessonsLeft > 0 || s.grimoire.quizPending;
    case 'GRIMOIRE_LAST': return s.grimoire.lessonsLeft > 0;
    // F15: os avisos de amigos não são agendados (enviados na hora pela acção).
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED': return false;
  }
}

/** Avisos devidos agora: no slot certo e só se ainda houver algo por fazer. */
export function dueNotifications(now: Date, tz: string, prefs: NotificationPrefsInput, state: NotificationState): DueNotification[] {
  return dueCandidates(now, tz, prefs)
    .filter((c) => pending(c.kind, state))
    .map(({ kind, periodKey }) => ({ kind, periodKey }));
}

/** Recuo automático (só nos avisos diários): ignorados 3 vezes seguidas passam a dia sim, dia não. */
export const BACKOFF_KINDS: NotificationKind[] = ['MORNING', 'BODY', 'NIGHT', 'GRIMOIRE', 'GRIMOIRE_LAST'];
export const BACKOFF_AFTER = 3;

export interface SentNotification {
  kind: NotificationKind;
  periodKey: string; // nos diários é o dia (YYYY-MM-DD)
  read: boolean; // aberto (push ou caixa de avisos), marcado como lido ou limpo
}

/**
 * Tira os avisos diários que a pessoa tem ignorado: se os últimos `BACKOFF_AFTER` desse tipo ficaram por abrir e o
 * último saiu ontem, hoje não sai. Basta abrir um para voltar ao ritmo normal.
 */
export function applyBackoff(todo: DueNotification[], history: SentNotification[], today: DateISO): DueNotification[] {
  return todo.filter((d) => {
    if (!BACKOFF_KINDS.includes(d.kind)) return true;
    const past = history
      .filter((h) => h.kind === d.kind && h.periodKey < today)
      .sort((a, b) => b.periodKey.localeCompare(a.periodKey));
    let ignored = 0;
    for (const h of past) {
      if (h.read) break;
      ignored++;
    }
    return ignored < BACKOFF_AFTER || past[0]!.periodKey !== addDays(today, -1);
  });
}
