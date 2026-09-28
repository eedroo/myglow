import { describe, expect, it } from 'vitest';
import { formatDeltaKg, formatGramsAsKg, parseKgToGrams } from './weight';

describe('parseKgToGrams', () => {
  it.each([
    ['76,250', 76250],
    ['76.25', 76250],
    ['76', 76000],
    [' 76,4 ', 76400],
    ['', null],
    ['   ', null],
  ])('%j → %j', (input, grams) => {
    expect(parseKgToGrams(input)).toBe(grams);
  });

  it.each(['abc', '76,2,5', '-70', '76.2505', '1000'])('%j lança erro', (input) => {
    expect(() => parseKgToGrams(input)).toThrow();
  });
});

describe('formatação', () => {
  it('formatGramsAsKg', () => {
    expect(formatGramsAsKg(76250, 'pt-PT')).toBe('76,25');
    expect(formatGramsAsKg(76250, 'en')).toBe('76.25');
    expect(formatGramsAsKg(76000, 'pt-BR')).toBe('76');
    expect(formatGramsAsKg(76400, 'pt-PT')).toBe('76,4');
    expect(formatGramsAsKg(102500, 'en')).toBe('102.5');
  });
  it('formatDeltaKg', () => {
    expect(formatDeltaKg(-400, 'pt-PT')).toBe('−0,4 kg');
    expect(formatDeltaKg(250, 'pt-PT')).toBe('+0,25 kg');
    expect(formatDeltaKg(1500, 'en')).toBe('+1.5 kg');
    expect(formatDeltaKg(0, 'en')).toBe('=');
  });
});
