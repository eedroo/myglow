import { describe, expect, it } from 'vitest';
import { mergeWeekPatches } from './patch';

describe('mergeWeekPatches', () => {
  it('campos simples: o mais recente ganha', () => {
    expect(mergeWeekPatches({ title: 'a', weightGrams: 70000 }, { title: 'b' })).toEqual({ title: 'b', weightGrams: 70000 });
  });

  it('notas dos dias juntam-se por data', () => {
    const merged = mergeWeekPatches(
      { dayNotes: [{ date: '2026-05-05', text: 'um' }, { date: '2026-05-06', text: 'dois' }] },
      { dayNotes: [{ date: '2026-05-05', text: 'um!' }] },
    );
    expect(merged.dayNotes).toEqual([
      { date: '2026-05-05', text: 'um!' },
      { date: '2026-05-06', text: 'dois' },
    ]);
  });

  it('projectos juntam-se por área e não se perdem com outros campos', () => {
    const merged = mergeWeekPatches({ projects: [{ area: 'MAGIC', text: 'x' }] }, { intention: 'y', projects: [{ area: 'STUDIES', text: 'z' }] });
    expect(merged).toEqual({
      intention: 'y',
      projects: [{ area: 'MAGIC', text: 'x' }, { area: 'STUDIES', text: 'z' }],
    });
  });
});
