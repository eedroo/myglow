import { DateTime } from 'luxon';
import type { DateISO } from './dates';

/**
 * Toda a lógica de semanas vive aqui. A semana começa ao domingo e pertence
 * ao mês (e ano) em que cai o domingo.
 */
export interface WeekKey {
  start: DateISO; // domingo
  year: number; // ano do domingo
  month: number; // 1–12, mês do domingo
  weekOfMonth: number; // 1–5: ordem do domingo dentro do mês
}

/** Planear à frente: semanas futuras editáveis até este limite. */
export const MAX_WEEKS_AHEAD = 52;

/** Vista do mês: navegação até 12 meses à frente. */
export const MAX_MONTHS_AHEAD = 12;

/** Planner anual: de 2000 até ao próximo ano. */
export const MIN_YEAR = 2000;
export const MAX_YEARS_AHEAD = 1;

const MONTH_KEY_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

function dt(date: DateISO): DateTime {
  const d = DateTime.fromISO(date, { zone: 'utc' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !d.isValid) throw new Error(`Invalid DateISO: ${date}`);
  return d;
}

const iso = (d: DateTime): DateISO => d.toISODate() as DateISO;

export function isSunday(date: DateISO): boolean {
  return dt(date).weekday === 7;
}

/** Domingo da semana que contém `date`. */
export function weekStartOf(date: DateISO): DateISO {
  const d = dt(date);
  return iso(d.minus({ days: d.weekday % 7 }));
}

/** Chave da semana a partir do domingo. Lança erro se `start` não for domingo. */
export function weekKey(start: DateISO): WeekKey {
  const d = dt(start);
  if (d.weekday !== 7) throw new Error(`Week start must be a Sunday: ${start}`);
  return { start, year: d.year, month: d.month, weekOfMonth: Math.floor((d.day - 1) / 7) + 1 };
}

/** 7 datas, domingo → sábado. */
export function weekDays(start: DateISO): DateISO[] {
  const d = dt(start);
  return Array.from({ length: 7 }, (_, i) => iso(d.plus({ days: i })));
}

/** Domingos do mês (cada um é o início de uma semana desse mês). */
export function weeksOfMonth(year: number, month: number): DateISO[] {
  const first = DateTime.utc(year, month, 1);
  let sunday = first.plus({ days: (7 - (first.weekday % 7)) % 7 });
  const out: DateISO[] = [];
  while (sunday.month === month) {
    out.push(iso(sunday));
    sunday = sunday.plus({ days: 7 });
  }
  return out;
}

/** Grelha do calendário: linhas domingo → sábado; `null` para dias fora do mês. */
export function monthGrid(year: number, month: number): (DateISO | null)[][] {
  const first = DateTime.utc(year, month, 1);
  const last = first.endOf('month').startOf('day');
  const rows: (DateISO | null)[][] = [];
  for (let cursor = first.minus({ days: first.weekday % 7 }); cursor <= last; cursor = cursor.plus({ days: 7 })) {
    rows.push(
      Array.from({ length: 7 }, (_, i) => {
        const d = cursor.plus({ days: i });
        return d.month === month ? iso(d) : null;
      }),
    );
  }
  return rows;
}

export function monthOf(date: DateISO): { year: number; month: number } {
  const d = dt(date);
  return { year: d.year, month: d.month };
}

export function isMonthKey(v: string): boolean {
  return MONTH_KEY_RE.test(v);
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseMonthKey(v: string): { year: number; month: number } {
  const m = MONTH_KEY_RE.exec(v);
  if (!m) throw new Error(`Invalid month key: ${v}`);
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const d = DateTime.utc(year, month, 1).plus({ months: n });
  return { year: d.year, month: d.month };
}

/** Primeiro e último dia do mês. */
export function monthRange(year: number, month: number): { from: DateISO; to: DateISO } {
  const first = DateTime.utc(year, month, 1);
  return { from: iso(first), to: iso(first.endOf('month')) };
}

/** Número de semanas (inteiras) entre dois domingos: positivo se `b` for depois de `a`. */
export function weeksBetween(a: DateISO, b: DateISO): number {
  return Math.round(dt(b).diff(dt(a), 'days').days / 7);
}
