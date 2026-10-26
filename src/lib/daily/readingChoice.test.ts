import { describe, expect, it } from 'vitest';
import { readingGate } from './readingChoice';

describe('readingGate', () => {
  it('hoje sem escolha → pergunta; agora → mostra', () => {
    expect(readingGate({ choice: null, isToday: true, isNight: false })).toBe('ask');
    expect(readingGate({ choice: 'NOW', isToday: true, isNight: false })).toBe('show');
  });
  it('à noite: espera durante o dia e mostra à noite', () => {
    expect(readingGate({ choice: 'NIGHT', isToday: true, isNight: false })).toBe('wait');
    expect(readingGate({ choice: 'NIGHT', isToday: true, isNight: true })).toBe('show');
  });
  it('dias passados mostram sempre', () => {
    expect(readingGate({ choice: null, isToday: false, isNight: false })).toBe('show');
    expect(readingGate({ choice: 'NIGHT', isToday: false, isNight: false })).toBe('show');
  });
});
