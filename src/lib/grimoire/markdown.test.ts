import { describe, expect, it } from 'vitest';
import { parseBlocks, parseInline, parseRich } from './markdown';

describe('markdown', () => {
  it('parseInline: só negrito', () => {
    expect(parseInline('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false },
    ]);
  });

  it('parseRich: links seguros e negrito', () => {
    expect(parseRich('Ver [Termos](/terms) e **já**.')).toEqual([
      { text: 'Ver ', bold: false },
      { text: 'Termos', bold: false, href: '/terms' },
      { text: ' e ', bold: false },
      { text: 'já', bold: true },
      { text: '.', bold: false },
    ]);
    expect(parseRich('[x](javascript:alert(1))')[0]).toEqual({ text: '[x](javascript:alert(1)', bold: false });
    expect(parseRich('[mail](mailto:a@b.pt)')[0]!.href).toBe('mailto:a@b.pt');
    expect(parseRich('[x](//evil.com)')[0]!.href).toBeUndefined();
  });

  it('parseBlocks: títulos, parágrafos, listas, citações e regras', () => {
    const md = '# Título\n\n> Rascunho\n> a rever\n\n## Secção\nLinha um\nlinha dois\n\n- a\n- b\n\n1. um\n2. dois\n\n---\nFim';
    expect(parseBlocks(md)).toEqual([
      { type: 'heading', level: 1, text: 'Título' },
      { type: 'quote', text: 'Rascunho a rever' },
      { type: 'heading', level: 2, text: 'Secção' },
      { type: 'paragraph', text: 'Linha um linha dois' },
      { type: 'list', ordered: false, items: ['a', 'b'] },
      { type: 'list', ordered: true, items: ['um', 'dois'] },
      { type: 'rule' },
      { type: 'paragraph', text: 'Fim' },
    ]);
  });
});
