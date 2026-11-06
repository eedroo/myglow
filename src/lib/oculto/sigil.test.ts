import { describe, expect, it } from 'vitest';
import { intentionLetters, sigilLetters } from './sigil';

describe('sigilLetters', () => {
  it('tira acentos, espaços e pontuação', () => {
    expect(intentionLetters('Eu durmo cedo, já!')).toEqual(['E', 'U', 'D', 'U', 'R', 'M', 'O', 'C', 'E', 'D', 'O', 'J', 'A']);
  });
  it('tira as repetidas e as vogais, pela ordem em que aparecem', () => {
    expect(sigilLetters('Eu durmo cedo')).toEqual({ unique: ['E', 'U', 'D', 'R', 'M', 'O', 'C'], final: ['D', 'R', 'M', 'C'] });
  });
  it('só vogais: fica com as letras únicas', () => {
    expect(sigilLetters('aia')).toEqual({ unique: ['A', 'I'], final: ['A', 'I'] });
  });
  it('vazio', () => {
    expect(sigilLetters('  ')).toEqual({ unique: [], final: [] });
  });
});
