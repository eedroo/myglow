import { describe, expect, it } from 'vitest';
import {
  addDays, compareDates, dayBoundsUtc, formatLongDate, fromDbDate, isDateISO, localNoonUtc, toDbDate, todayInTz,
} from './dates';

describe('todayInTz', () => {
  it('Lisboa 00:30 (WEST) já é o dia seguinte', () => {
    expect(todayInTz('Europe/Lisbon', new Date('2026-05-06T23:30:00Z'))).toBe('2026-05-07');
  });
  it('São Paulo 22:30 ainda é o dia anterior', () => {
    expect(todayInTz('America/Sao_Paulo', new Date('2026-05-07T01:30:00Z'))).toBe('2026-05-06');
  });
});

describe('dayBoundsUtc', () => {
  it('dia de mudança para a hora de verão em Lisboa dura 23 h', () => {
    const { start, end } = dayBoundsUtc('2026-03-29', 'Europe/Lisbon');
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
  });
  it('dia de regresso à hora de inverno dura 25 h', () => {
    const { start, end } = dayBoundsUtc('2026-10-25', 'Europe/Lisbon');
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });
  it('dia normal começa à meia-noite local', () => {
    expect(dayBoundsUtc('2026-05-06', 'Europe/Lisbon').start.toISOString()).toBe('2026-05-05T23:00:00.000Z');
  });
});

describe('conversões', () => {
  it('toDbDate / fromDbDate ida e volta', () => {
    for (const d of ['2026-01-01', '2026-03-29', '2000-02-29', '2026-12-31']) {
      expect(fromDbDate(toDbDate(d))).toBe(d);
    }
    expect(toDbDate('2026-05-06').toISOString()).toBe('2026-05-06T00:00:00.000Z');
  });
  it('localNoonUtc', () => {
    expect(localNoonUtc('2026-05-06', 'Europe/Lisbon').toISOString()).toBe('2026-05-06T11:00:00.000Z');
    expect(localNoonUtc('2026-01-06', 'Europe/Lisbon').toISOString()).toBe('2026-01-06T12:00:00.000Z');
  });
  it('addDays atravessa meses e anos', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('compareDates', () => {
    expect(compareDates('2026-05-06', '2026-05-07')).toBe(-1);
    expect(compareDates('2026-05-07', '2026-05-07')).toBe(0);
    expect(compareDates('2026-12-01', '2026-05-07')).toBe(1);
  });
  it('isDateISO', () => {
    expect(isDateISO('2026-05-06')).toBe(true);
    expect(isDateISO('2026-02-30')).toBe(false);
    expect(isDateISO('06-05-2026')).toBe(false);
  });
  it('formatLongDate não muda de dia', () => {
    expect(formatLongDate('2026-05-06', 'pt-PT')).toBe('quarta-feira, 6 de maio de 2026');
    expect(formatLongDate('2026-05-06', 'en')).toContain('6 May 2026');
  });
});

describe('formatação com Intl', () => {
  it('intervalo da semana', async () => {
    const { formatDateRange } = await import('./dates');
    expect(formatDateRange('2026-05-03', '2026-05-09', 'pt-PT')).toBe('3–9 mai 2026');
    expect(formatDateRange('2026-04-26', '2026-05-02', 'en')).toBe('26 Apr – 2 May 2026');
    expect(formatDateRange('2025-12-28', '2026-01-03', 'pt-BR')).toBe('28 dez 2025 – 3 jan 2026');
  });
  it('nomes de meses e dias', async () => {
    const { formatMonthName, formatMonthYear, formatWeekdayShort } = await import('./dates');
    expect(formatMonthName(2026, 5, 'pt-PT')).toBe('Maio');
    expect(formatMonthName(2026, 5, 'en')).toBe('May');
    expect(formatMonthYear(2026, 5, 'pt-BR')).toBe('Maio de 2026');
    expect(formatWeekdayShort('2026-05-03', 'pt-PT')).toBe('dom');
    expect(formatWeekdayShort('2026-05-09', 'pt-BR')).toBe('sáb');
    expect(formatWeekdayShort('2026-05-04', 'en')).toBe('Mon');
  });
  it('instante no fuso do utilizador', async () => {
    const { formatInstant } = await import('./dates');
    expect(formatInstant('2026-05-01T17:23:47Z', 'Europe/Lisbon', 'pt-PT', 'weekday')).toBe('sex, 18:23');
    expect(formatInstant('2026-05-01T17:23:47Z', 'Europe/Lisbon', 'en', 'date')).toBe('1 May, 18:23');
    // 23:30Z em Lisboa (WEST) já é o dia seguinte
    expect(formatInstant('2026-05-06T23:30:00Z', 'Europe/Lisbon', 'pt-PT', 'date')).toBe('7 mai, 00:30');
  });
});
