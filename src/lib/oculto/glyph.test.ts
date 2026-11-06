import { describe, expect, it } from 'vitest';
import { addPoint, normalizePoint, parseStrokes, strokePath, strokesSchema, MAX_POINTS } from './glyph';

describe('glyph', () => {
  it('normaliza para 0–100 e corta fora do quadro', () => {
    expect(normalizePoint(150, 75, 300)).toEqual([50, 25]);
    expect(normalizePoint(-10, 400, 300)).toEqual([0, 100]);
  });
  it('ignora pontos colados ao anterior', () => {
    const s = addPoint(addPoint([], [10, 10]), [10, 11]);
    expect(s).toEqual([[10, 10]]);
    expect(addPoint(s, [14, 10])).toEqual([[10, 10], [14, 10]]);
  });
  it('caminho SVG', () => {
    expect(strokePath([[1, 2], [3, 4]])).toBe('M1 2L3 4');
    expect(strokePath([[5, 5]])).toBe('M5 5l0.01 0');
  });
  it('valida traços', () => {
    expect(strokesSchema.safeParse([[[0, 0], [100, 100]]]).success).toBe(true);
    expect(strokesSchema.safeParse([]).success).toBe(false);
    expect(strokesSchema.safeParse([[[0, 101]]]).success).toBe(false);
    expect(strokesSchema.safeParse([[[0.5, 1]]]).success).toBe(false);
    const big = Array.from({ length: 2 }, () => Array.from({ length: MAX_POINTS }, () => [1, 1]));
    expect(strokesSchema.safeParse(big).success).toBe(false);
    expect(parseStrokes('lixo')).toEqual([]);
  });
});
