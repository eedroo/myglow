import { describe, expect, it } from 'vitest';
import { evaluateWeek, nextWeek, weekStatus, type SessionLog } from './rules';
import { availableWeeks, getProgram, getWeek } from './content';

const log = (day: number, p: Partial<SessionLog> = {}): SessionLog => ({
  day, date: `2026-11-0${day}`, plannedSec: 300, actualSec: 300, concentration: 6, difficulty: 'coceira no nariz', notes: null, ...p,
});
const week = { sessions: [5, 7, 10, 12, 15].map((m, i) => ({ day: i + 1, title: 'x', mainMinutes: m, observeMinutes: 5, focus: 'x', cues: [] })) };

describe('weekStatus', () => {
  it('uma sessão por dia, por ordem', () => {
    expect(weekStatus({ logs: [], today: '2026-11-02', daysSinceStart: 0 })).toMatchObject({ next: 1, canPractice: true, reviewReady: false });
    const s = weekStatus({ logs: [log(1, { date: '2026-11-02' })], today: '2026-11-02', daysSinceStart: 0 });
    expect(s).toMatchObject({ next: 2, doneToday: true, canPractice: false });
    expect(weekStatus({ logs: [log(1, { date: '2026-11-02' })], today: '2026-11-03', daysSinceStart: 1 }).canPractice).toBe(true);
  });
  it('avaliação com as 5 sessões, ou passados 7 dias com pelo menos uma', () => {
    expect(weekStatus({ logs: [1, 2, 3, 4, 5].map((d) => log(d)), today: '2026-11-09', daysSinceStart: 5 }).reviewReady).toBe(true);
    expect(weekStatus({ logs: [log(1)], today: '2026-11-09', daysSinceStart: 7 }).reviewReady).toBe(true);
    expect(weekStatus({ logs: [], today: '2026-11-09', daysSinceStart: 9 }).reviewReady).toBe(false);
  });
});

describe('evaluateWeek', () => {
  it('5 sessões, 15 min na última e diário escrito → avança (consistente)', () => {
    const logs = [1, 2, 3, 4, 5].map((d) => log(d, { actualSec: week.sessions[d - 1]!.mainMinutes * 60 }));
    expect(evaluateWeek(week, logs)).toMatchObject({ result: 'ADVANCE', level: 'consistent', reasons: [] });
  });
  it('concentração média 7+ → consolidado', () => {
    const logs = [1, 2, 3, 4, 5].map((d) => log(d, { actualSec: 900, concentration: 8 }));
    expect(evaluateWeek(week, logs).level).toBe('consolidated');
  });
  it('poucas sessões, tempo curto e diário vazio → repete, com as razões', () => {
    const logs = [log(1, { difficulty: null }), log(2, { actualSec: 400, difficulty: null })];
    expect(evaluateWeek(week, logs)).toMatchObject({ result: 'REPEAT', level: 'beginner', reasons: ['sessions', 'goal', 'diary'] });
  });
  it('12 min (80 % de 15) já conta como tempo atingido', () => {
    const logs = [1, 2, 3, 4].map((d) => log(d, { actualSec: 720 }));
    expect(evaluateWeek(week, logs).reasons).not.toContain('goal');
  });
  it('concentração baixa e sem melhoria → foco', () => {
    const logs = [1, 2, 3, 4, 5].map((d) => log(d, { actualSec: 900, concentration: 3 }));
    expect(evaluateWeek(week, logs).reasons).toEqual(['focus']);
    const better = [1, 2, 3, 4, 5].map((d) => log(d, { actualSec: 900, concentration: d === 5 ? 5 : 2 }));
    expect(evaluateWeek(week, better).result).toBe('ADVANCE');
  });
  it('na semana dos sonhos, o sonho conta como registo do diário', () => {
    const logs = [1, 2, 3, 4].map((d) => log(d, { actualSec: 900, difficulty: null, dream: 'uma casa azul' }));
    expect(evaluateWeek(week, logs).metrics.diaryCount).toBe(4);
    expect(evaluateWeek(week, logs).reasons).not.toContain('diary');
  });
  it('nas operações, experiência, interpretação ou evidência contam como registo do diário', () => {
    const logs = [1, 2, 3, 4].map((d) => log(d, { actualSec: 900, difficulty: null, [(['experience', 'interpretation', 'evidence'] as const)[d % 3]!]: 'algo' }));
    expect(evaluateWeek(week, logs).metrics.diaryCount).toBe(4);
  });
});

describe('conteúdo (content/oculto)', () => {
  it('programa e Fases I a III válidos, semanas 1 a 12 escritas', () => {
    expect(getProgram().phases).toHaveLength(6);
    expect(availableWeeks()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const w of availableWeeks()) expect(getWeek(w)!.sessions.map((s) => s.day)).toEqual([1, 2, 3, 4, 5]);
    expect(getWeek(13)).toBeNull();
    expect(nextWeek(4, availableWeeks())).toBe(5);
    expect(nextWeek(8, availableWeeks())).toBe(9);
    expect(nextWeek(12, availableWeeks())).toBeNull();
    expect(availableWeeks().filter((w) => getWeek(w)!.dreamJournal)).toEqual([8]);
    expect(availableWeeks().filter((w) => getWeek(w)!.operationsJournal)).toEqual([9, 10, 11, 12]);
    expect(availableWeeks().filter((w) => getWeek(w)!.sigilHelper)).toEqual([12]);
  });
  it('sem travessões nem "presença"', () => {
    for (const w of availableWeeks()) expect(JSON.stringify(getWeek(w))).not.toMatch(/—|presen/i);
  });
});
