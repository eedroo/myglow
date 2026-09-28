import { DateTime } from 'luxon';
import { intlLocale, type AppLocale } from '@/i18n/locales';

/**
 * Datas de calendário circulam como `YYYY-MM-DD` e só viram `Date` na fronteira com o Prisma
 * (`toDbDate` / `fromDbDate`, meia-noite UTC). Nunca usar `new Date('YYYY-MM-DD')` solto.
 */
export type DateISO = string; // 'YYYY-MM-DD'

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateISO(v: string): v is DateISO {
  return ISO_RE.test(v) && DateTime.fromISO(v, { zone: 'utc' }).isValid;
}

function parse(date: DateISO, zone = 'utc'): DateTime {
  const dt = DateTime.fromISO(date, { zone });
  if (!ISO_RE.test(date) || !dt.isValid) throw new Error(`Invalid DateISO: ${date}`);
  return dt;
}

/** Dia de calendário actual no fuso IANA indicado. */
export function todayInTz(tz: string, now: Date = new Date()): DateISO {
  return DateTime.fromJSDate(now, { zone: tz }).toISODate() as DateISO;
}

export function addDays(date: DateISO, n: number): DateISO {
  return parse(date).plus({ days: n }).toISODate() as DateISO;
}

export function compareDates(a: DateISO, b: DateISO): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0; // formato ISO fixo → comparação lexicográfica é cronológica
}

/** 12:00 local da data, como instante UTC. */
export function localNoonUtc(date: DateISO, tz: string): Date {
  return parse(date, tz).set({ hour: 12 }).toUTC().toJSDate();
}

/** Limites [00:00, 24:00) locais em UTC. Pode durar 23 ou 25 h em dias de mudança de hora. */
export function dayBoundsUtc(date: DateISO, tz: string): { start: Date; end: Date } {
  const start = parse(date, tz).startOf('day');
  return { start: start.toUTC().toJSDate(), end: start.plus({ days: 1 }).toUTC().toJSDate() };
}

export function toDbDate(date: DateISO): Date {
  parse(date);
  return new Date(`${date}T00:00:00.000Z`);
}

export function fromDbDate(d: Date): DateISO {
  return d.toISOString().slice(0, 10);
}

/** "quarta-feira, 6 de maio de 2026" / "Wednesday 6 May 2026". */
export function formatLongDate(date: DateISO, locale: AppLocale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toDbDate(date));
}

/** "06 / 05 / 2026". */
export function formatNumericDate(date: DateISO): string {
  const [y, m, d] = date.split('-');
  return `${d} / ${m} / ${y}`;
}

/** Hora local "HH:mm" de um instante ISO UTC. */
export function formatTimeInTz(isoUtc: string, tz: string): string {
  return DateTime.fromISO(isoUtc, { zone: 'utc' }).setZone(tz).toFormat('HH:mm');
}
