import { describe, expect, it } from 'vitest';
import { LOCALES } from '@/i18n/locales';
import { getJourneyLessons } from './content';

const NEEDED = ['stage-2', 'stage-3', 'stage-4', 'stage-5', 'month-year'];

describe('mini-lições da jornada (content/journey)', () => {
  it.each(LOCALES)('%s: válidas, com todos os desbloqueios', (locale) => {
    const lessons = getJourneyLessons(locale);
    expect(lessons.map((l) => l.unlockId).sort()).toEqual([...NEEDED].sort());
  });

  it('os mesmos slides (ids, ícones e condições) nas 3 línguas', () => {
    const shape = (locale: (typeof LOCALES)[number]) =>
      getJourneyLessons(locale).map((l) => [l.unlockId, l.tryTarget, l.slides.map((s) => `${s.id}:${s.icon}:${s.only ?? ''}`)]);
    expect(shape('pt-PT')).toEqual(shape('pt-BR'));
    expect(shape('en')).toEqual(shape('pt-BR'));
  });

  it('sem travessões, sem "presença" e PT-PT com "tu"', () => {
    for (const locale of LOCALES) {
      const text = JSON.stringify(getJourneyLessons(locale));
      expect(text).not.toMatch(/—|presen/i);
      if (locale === 'pt-PT') expect(text).not.toMatch(/\bvocê\b/i);
    }
  });
});
