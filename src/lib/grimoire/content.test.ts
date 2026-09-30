import { describe, expect, it } from 'vitest';
import { checkContent, getCatalog, getCourse, resolveContentLocale } from './content';
import { parseInline } from './markdown';

describe('conteúdo do Grimório', () => {
  it('todos os ficheiros validam (content:check)', () => {
    expect(checkContent()).toEqual([]);
  });

  it('vida-magica: 6 lições, 5 perguntas de quiz, ids únicos', () => {
    expect(getCatalog()[0]).toMatchObject({ slug: 'vida-magica', order: 1, required: true });
    const c = getCourse('vida-magica', 'pt-BR')!;
    expect(c.lessons).toHaveLength(6);
    expect(c.quiz).toHaveLength(5);
    const cardIds = c.lessons.flatMap((l) => l.cards.map((k) => k.id));
    expect(new Set(cardIds).size).toBe(cardIds.length);
    expect(getCourse('vida-magica', 'en')).toBeNull();
    expect(getCourse('nao-existe', 'pt-BR')).toBeNull();
  });
});

describe('resolveContentLocale', () => {
  it('pt-PT lê pt-BR; en só com "ler em português"', () => {
    expect(resolveContentLocale('pt-PT', false, ['pt-BR'])).toBe('pt-BR');
    expect(resolveContentLocale('en', false, ['pt-BR'])).toBeNull();
    expect(resolveContentLocale('en', true, ['pt-BR'])).toBe('pt-BR');
    expect(resolveContentLocale('pt-BR', false, ['pt-BR'])).toBe('pt-BR');
    expect(resolveContentLocale('pt-PT', false, ['pt-BR', 'pt-PT'])).toBe('pt-PT');
    expect(resolveContentLocale('en', false, ['pt-BR', 'en'])).toBe('en');
  });
});

describe('parseInline', () => {
  it('só **negrito**, o resto é texto', () => {
    expect(parseInline('A **vontade** e a **ação**.')).toEqual([
      { text: 'A ', bold: false },
      { text: 'vontade', bold: true },
      { text: ' e a ', bold: false },
      { text: 'ação', bold: true },
      { text: '.', bold: false },
    ]);
    expect(parseInline('<b>x</b>')).toEqual([{ text: '<b>x</b>', bold: false }]);
  });
});
