import { describe, expect, it } from 'vitest';
import { levelFor } from './levels';

describe('levelFor', () => {
  it.each([
    [0, 1, 'seed'],
    [299, 1, 'seed'],
    [300, 2, 'sprout'],
    [999, 2, 'sprout'],
    [1000, 3, 'flame'],
    [14999, 6, 'sun'],
    [15000, 7, 'constellation'],
  ])('%i Glow → nível %i (%s)', (xp, level, key) => {
    expect(levelFor(xp)).toMatchObject({ level, key });
  });

  it('nível máximo sem próximo limiar', () => {
    expect(levelFor(15000)).toMatchObject({ nextMinXp: null, progress: 1 });
    expect(levelFor(99999).level).toBe(7);
  });

  it('progresso dentro do nível', () => {
    expect(levelFor(650).progress).toBe(0.5);
    expect(levelFor(0).progress).toBe(0);
    expect(levelFor(300)).toMatchObject({ minXp: 300, nextMinXp: 1000, progress: 0 });
  });
});
