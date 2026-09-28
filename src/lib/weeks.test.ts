import { describe, expect, it } from 'vitest';
import { addMonths, isMonthKey, isSunday, monthGrid, monthKey, weekDays, weekKey, weekStartOf, weeksOfMonth } from './weeks';

describe('semanas (começam ao domingo)', () => {
  it('quarta 6 de maio → domingo 3 de maio, semana 1 de maio', () => {
    expect(weekStartOf('2026-05-06')).toBe('2026-05-03');
    expect(weekKey('2026-05-03')).toEqual({ start: '2026-05-03', year: 2026, month: 5, weekOfMonth: 1 });
  });

  it('1 e 2 de maio pertencem à última semana de abril', () => {
    expect(weekStartOf('2026-05-01')).toBe('2026-04-26');
    expect(weekStartOf('2026-05-02')).toBe('2026-04-26');
    expect(weekKey('2026-04-26')).toMatchObject({ month: 4, weekOfMonth: 4 });
  });

  it('um domingo é o início da sua própria semana', () => {
    expect(weekStartOf('2026-05-03')).toBe('2026-05-03');
    expect(isSunday('2026-05-03')).toBe(true);
    expect(isSunday('2026-05-04')).toBe(false);
  });

  it('domingos de maio de 2026', () => {
    expect(weeksOfMonth(2026, 5)).toEqual(['2026-05-03', '2026-05-10', '2026-05-17', '2026-05-24', '2026-05-31']);
    expect(weeksOfMonth(2026, 2)).toEqual(['2026-02-01', '2026-02-08', '2026-02-15', '2026-02-22']);
  });

  it('1 de janeiro de 2026 pertence à semana 4 de dezembro de 2025', () => {
    expect(weekStartOf('2026-01-01')).toBe('2025-12-28');
    expect(weekKey('2025-12-28')).toMatchObject({ year: 2025, month: 12, weekOfMonth: 4 });
  });

  it('weekKey lança erro se não for domingo', () => {
    expect(() => weekKey('2026-05-04')).toThrow();
  });

  it('weekDays devolve domingo → sábado', () => {
    expect(weekDays('2026-04-26')).toEqual([
      '2026-04-26', '2026-04-27', '2026-04-28', '2026-04-29', '2026-04-30', '2026-05-01', '2026-05-02',
    ]);
  });
});

describe('monthGrid', () => {
  it('maio de 2026: 6 linhas, começa numa sexta', () => {
    const grid = monthGrid(2026, 5);
    expect(grid).toHaveLength(6);
    expect(grid[0]).toEqual([null, null, null, null, null, '2026-05-01', '2026-05-02']);
    expect(grid[5]).toEqual(['2026-05-31', null, null, null, null, null, null]);
    expect(grid.flat().filter(Boolean)).toHaveLength(31);
  });

  it('fevereiro de 2026 cabe em 4 linhas exactas', () => {
    const grid = monthGrid(2026, 2);
    expect(grid).toHaveLength(4);
    expect(grid[0]?.[0]).toBe('2026-02-01');
    expect(grid[3]?.[6]).toBe('2026-02-28');
  });

  it('todas as linhas têm 7 células', () => {
    for (let m = 1; m <= 12; m++) for (const row of monthGrid(2026, m)) expect(row).toHaveLength(7);
  });
});

describe('meses', () => {
  it('monthKey / isMonthKey', () => {
    expect(monthKey(2026, 5)).toBe('2026-05');
    expect(isMonthKey('2026-05')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('2026-5')).toBe(false);
  });
  it('addMonths atravessa anos', () => {
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});
