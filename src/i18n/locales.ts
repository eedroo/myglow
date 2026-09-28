/** Locales suportados e mapeamento Prisma `Locale` ↔ cookie `NEXT_LOCALE`. */

export const LOCALES = ['pt-PT', 'pt-BR', 'en'] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DB_LOCALES = ['PT_PT', 'PT_BR', 'EN'] as const;
export type DbLocale = (typeof DB_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'pt-PT';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

const DB_TO_APP: Record<DbLocale, AppLocale> = { PT_PT: 'pt-PT', PT_BR: 'pt-BR', EN: 'en' };
const APP_TO_DB: Record<AppLocale, DbLocale> = { 'pt-PT': 'PT_PT', 'pt-BR': 'PT_BR', en: 'EN' };

/** Locale usado em `Intl.DateTimeFormat` (EN → en-GB para formato dia/mês). */
const APP_TO_INTL: Record<AppLocale, string> = { 'pt-PT': 'pt-PT', 'pt-BR': 'pt-BR', en: 'en-GB' };

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function dbToAppLocale(locale: DbLocale): AppLocale {
  return DB_TO_APP[locale];
}

export function appToDbLocale(locale: AppLocale): DbLocale {
  return APP_TO_DB[locale];
}

export function intlLocale(locale: AppLocale): string {
  return APP_TO_INTL[locale];
}

/** Língua para a API Open-Meteo. */
export function geocodeLanguage(locale: AppLocale): 'pt' | 'en' {
  return locale === 'en' ? 'en' : 'pt';
}

/**
 * Resolve o locale a partir do header Accept-Language:
 * `pt-BR` → pt-BR; qualquer outro `pt*` → pt-PT; outra língua → en; vazio → pt-PT.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): AppLocale {
  if (!header) return DEFAULT_LOCALE;
  const tags = header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { tag: tag.toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((t) => t.tag && t.tag !== '*')
    .sort((a, b) => b.q - a.q);

  const first = tags[0];
  if (!first) return DEFAULT_LOCALE;
  if (first.tag === 'pt-br') return 'pt-BR';
  if (first.tag.startsWith('pt')) return 'pt-PT';
  return 'en';
}

/** Opções do cookie `NEXT_LOCALE` (1 ano). */
export const LOCALE_COOKIE_OPTIONS = {
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax' as const,
};
