import { describe, expect, it } from 'vitest';
import { mergePlanPatches } from './patch';

describe('mergePlanPatches', () => {
  it('campos simples: o mais recente ganha; projectos por área', () => {
    expect(
      mergePlanPatches<{ word?: string; projects?: { area: 'MAGIC' | 'STUDIES'; text: string }[] }>(
        { word: 'a', projects: [{ area: 'MAGIC', text: '1' }] },
        { word: 'b', projects: [{ area: 'MAGIC', text: '2' }, { area: 'STUDIES', text: '3' }] },
      ),
    ).toEqual({ word: 'b', projects: [{ area: 'MAGIC', text: '2' }, { area: 'STUDIES', text: '3' }] });
  });
});
