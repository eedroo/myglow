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
