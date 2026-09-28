/** Mapeamento `ThemePref` (Prisma) ↔ next-themes e cores de sistema (meta theme-color / manifest). */

export type ThemePref = 'LIGHT' | 'DARK' | 'SYSTEM';
export type NextTheme = 'light' | 'dark' | 'system';

const PREF_TO_NEXT: Record<ThemePref, NextTheme> = { LIGHT: 'light', DARK: 'dark', SYSTEM: 'system' };
const NEXT_TO_PREF: Record<NextTheme, ThemePref> = { light: 'LIGHT', dark: 'DARK', system: 'SYSTEM' };

export function prefToNextTheme(pref: ThemePref): NextTheme {
  return PREF_TO_NEXT[pref];
}

export function nextThemeToPref(theme: string | undefined): ThemePref | undefined {
  return theme && theme in NEXT_TO_PREF ? NEXT_TO_PREF[theme as NextTheme] : undefined;
}

/**
 * Cores que o browser/SO precisam fora do CSS (theme-color, manifest).
 * Espelham `--bg-base` e `--gold-500` de src/styles/tokens.css — manter em sincronia.
 */
export const SYSTEM_COLORS = {
  lightBackground: '#FBF7EF',
  darkBackground: '#15110B',
  gold: '#C9A25C',
} as const;
