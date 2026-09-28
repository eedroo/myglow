import { describe, expect, it } from 'vitest';
import { toBirthUtc } from './birth';

describe('toBirthUtc', () => {
  it('aplica o horário de verão histórico de Lisboa (WEST, UTC+1)', () => {
    expect(toBirthUtc('1990-07-15', '14:30', 'Europe/Lisbon').toISOString()).toBe('1990-07-15T13:30:00.000Z');
  });

  it('usa UTC+0 em Lisboa no inverno', () => {
    expect(toBirthUtc('1990-01-15', '14:30', 'Europe/Lisbon').toISOString()).toBe('1990-01-15T14:30:00.000Z');
  });

  it('usa o fuso histórico de São Paulo sem horário de verão (UTC-3)', () => {
    // O Brasil não teve horário de verão entre 1968 e Nov/1985 (tzdb), por isso 10/03/1985 é UTC-3.
    expect(toBirthUtc('1985-03-10', '08:00', 'America/Sao_Paulo').toISOString()).toBe('1985-03-10T11:00:00.000Z');
  });

  it('aplica o horário de verão histórico de São Paulo (UTC-2)', () => {
    expect(toBirthUtc('1986-01-10', '08:00', 'America/Sao_Paulo').toISOString()).toBe('1986-01-10T10:00:00.000Z');
  });

  it('usa 12:00 local quando a hora é desconhecida', () => {
    expect(toBirthUtc('1990-07-15', null, 'Europe/Lisbon').toISOString()).toBe('1990-07-15T11:00:00.000Z');
  });

  it('lança erro com hora inválida', () => {
    expect(() => toBirthUtc('1990-07-15', '25:61', 'Europe/Lisbon')).toThrow();
  });

  it('lança erro com fuso inválido', () => {
    expect(() => toBirthUtc('1990-07-15', '10:00', 'Not/AZone')).toThrow();
  });
});
