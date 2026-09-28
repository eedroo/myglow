import { describe, expect, it } from 'vitest';
import { appToDbLocale, dbToAppLocale, localeFromAcceptLanguage } from './locales';

describe('localeFromAcceptLanguage', () => {
  it.each([
    ['pt-BR,pt;q=0.9,en;q=0.8', 'pt-BR'],
    ['pt-PT,pt;q=0.9', 'pt-PT'],
    ['pt', 'pt-PT'],
    ['pt-AO', 'pt-PT'],
    ['en-US,en;q=0.9', 'en'],
    ['fr-FR,fr;q=0.9', 'en'],
    ['en;q=0.5,pt-BR;q=0.9', 'pt-BR'],
    ['', 'pt-PT'],
  ])('%s → %s', (header, expected) => {
    expect(localeFromAcceptLanguage(header)).toBe(expected);
  });
});

describe('mapeamento Prisma ↔ cookie', () => {
  it('é bijectivo', () => {
    for (const db of ['PT_PT', 'PT_BR', 'EN'] as const) expect(appToDbLocale(dbToAppLocale(db))).toBe(db);
  });
});
