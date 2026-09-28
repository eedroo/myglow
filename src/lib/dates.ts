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

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

function monthShort(date: DateISO, locale: AppLocale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: 'short', timeZone: 'UTC' })
    .format(toDbDate(date))
    .replace('.', '');
}

/**
 * "3–9 mai 2026" / "26 abr – 2 mai 2026" / "28 dez 2025 – 3 jan 2026".
 * Montado com partes do Intl (o formatRange de pt-PT cai em formato numérico).
 */
export function formatDateRange(from: DateISO, to: DateISO, locale: AppLocale): string {
  const [fy, , fd] = from.split('-').map(Number);
  const [ty, , td] = to.split('-').map(Number);
  const fm = monthShort(from, locale);
  const tm = monthShort(to, locale);
  if (fy !== ty) return `${fd} ${fm} ${fy} – ${td} ${tm} ${ty}`;
  if (fm !== tm) return `${fd} ${fm} – ${td} ${tm} ${ty}`;
  return `${fd}–${td} ${fm} ${ty}`;
}

/** "dom", "seg"… / "Sun", "Mon"… (em português, as 3 primeiras letras do nome, como no papel). */
export function formatWeekdayShort(date: DateISO, locale: AppLocale): string {
  if (locale === 'en') {
    return new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'short', timeZone: 'UTC' }).format(toDbDate(date));
  }
  const long = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'long', timeZone: 'UTC' }).format(toDbDate(date));
  return long.slice(0, 3);
}

/** Nome do mês com maiúscula: "Maio" / "May". */
export function formatMonthName(year: number, month: number, locale: AppLocale): string {
  const d = new Date(Date.UTC(year, month - 1, 1));
  return capitalize(new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', timeZone: 'UTC' }).format(d));
}

/** "Maio de 2026" / "May 2026". */
export function formatMonthYear(year: number, month: number, locale: AppLocale): string {
  const d = new Date(Date.UTC(year, month - 1, 1));
  return capitalize(new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d));
}

/** Instante no fuso do utilizador: "ter, 18:23" (weekday) ou "1 mai, 18:23" (date). */
export function formatInstant(isoUtc: string, tz: string, locale: AppLocale, style: 'weekday' | 'date'): string {
  const time = new Intl.DateTimeFormat(intlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: tz,
  }).format(new Date(isoUtc));
  const localDate = DateTime.fromISO(isoUtc, { zone: 'utc' }).setZone(tz).toISODate() as DateISO;
  const day =
    style === 'weekday'
      ? formatWeekdayShort(localDate, locale)
      : `${Number(localDate.slice(8))} ${monthShort(localDate, locale)}`;
  return `${day}, ${time}`;
}
