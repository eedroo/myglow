import { addDays, compareDates, type DateISO } from '@/lib/dates';
import { addMonths, isMonthKey, isSunday, monthKey, monthRange, parseMonthKey, weekStartOf } from '@/lib/weeks';

/**
 * Retrospectiva (F13): períodos e elegibilidade para abrir sozinha. Funções puras.
 */
export type RecapKindKey = 'WEEK' | 'MONTH';

export interface RecapPeriod {
  kind: RecapKindKey;
  key: string; // 'YYYY-MM-DD' (domingo) | 'YYYY-MM'
  from: DateISO;
  to: DateISO; // inclusivo
  prev: { from: DateISO; to: DateISO }; // período anterior, para comparações
}

/** Semana que começa no domingo `start`. Lança erro se não for domingo. */
export function weekRecapPeriod(start: DateISO): RecapPeriod {
  if (!isSunday(start)) throw new Error(`Week start must be a Sunday: ${start}`);
  return {
    kind: 'WEEK',
    key: start,
    from: start,
    to: addDays(start, 6),
    prev: { from: addDays(start, -7), to: addDays(start, -1) },
  };
}

/** Mês `YYYY-MM`. Lança erro se a chave for inválida. */
export function monthRecapPeriod(key: string): RecapPeriod {
  if (!isMonthKey(key)) throw new Error(`Invalid month key: ${key}`);
  const { year, month } = parseMonthKey(key);
  const p = addMonths(year, month, -1);
  return { kind: 'MONTH', key, ...monthRange(year, month), prev: monthRange(p.year, p.month) };
}

export function recapPeriod(kind: RecapKindKey, key: string): RecapPeriod {
  return kind === 'WEEK' ? weekRecapPeriod(key) : monthRecapPeriod(key);
}

/** O período já acabou (o último dia é anterior a hoje). */
export function isEnded(p: RecapPeriod, today: DateISO): boolean {
  return compareDates(p.to, today) < 0;
}

/** Semanal abre sozinha de domingo a quarta; mensal do dia 1 ao dia 5. Depois disso só pelo botão. */
export const AUTO_OPEN_DAYS = { WEEK: 4, MONTH: 5 } as const;

/** Semana anterior à semana de `today`. */
export function previousWeekPeriod(today: DateISO): RecapPeriod {
  return weekRecapPeriod(addDays(weekStartOf(today), -7));
}

/** Mês anterior ao mês de `today`. */
export function previousMonthPeriod(today: DateISO): RecapPeriod {
  const [y, m] = today.split('-').map(Number) as [number, number];
  const p = addMonths(y, m, -1);
  return monthRecapPeriod(monthKey(p.year, p.month));
}

/** O período acabou e a conta já existia antes do seu fim. */
export function isRecapAvailable(p: RecapPeriod, today: DateISO, accountCreatedDay: DateISO): boolean {
  return isEnded(p, today) && compareDates(accountCreatedDay, p.to) <= 0;
}

/** `today` ainda está na janela de abertura do período anterior (semanal: domingo a quarta; mensal: dia 1 a 5). */
export function inAutoOpenWindow(kind: RecapKindKey, today: DateISO): boolean {
  const daysIn =
    kind === 'MONTH'
      ? Number(today.slice(8, 10)) - 1
      : Math.round((Date.parse(today) - Date.parse(weekStartOf(today))) / 86_400_000);
  return daysIn < AUTO_OPEN_DAYS[kind];
}

export function dueRecap(i: {
  today: DateISO;
  accountCreatedDay: DateISO;
  seen: { kind: RecapKindKey; key: string }[];
  blocked: boolean; // guia activo, PolicyUpdateDialog ou LevelUpDialog pendentes
}): RecapPeriod | null {
  if (i.blocked) return null;
  const seen = new Set(i.seen.map((s) => `${s.kind}:${s.key}`));
  const candidate = (p: RecapPeriod) => inAutoOpenWindow(p.kind, i.today) && isRecapAvailable(p, i.today, i.accountCreatedDay);
  const unseen = (p: RecapPeriod) => (seen.has(`${p.kind}:${p.key}`) ? null : p);

  // Mensal primeiro: quando as duas coincidem, só a mensal abre (a semanal fica no botão da Semana).
  const month = previousMonthPeriod(i.today);
  if (candidate(month)) return unseen(month);

  const week = previousWeekPeriod(i.today);
  if (candidate(week)) return unseen(week);

  return null;
}

export const MIN_DAYS_TOUCHED = 2;

export function isWorthShowing(daysTouched: number): boolean {
  return daysTouched >= MIN_DAYS_TOUCHED;
}
