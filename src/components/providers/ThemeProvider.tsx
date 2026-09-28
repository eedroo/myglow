'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';
import type { NextTheme } from '@/lib/theme';

interface ThemeProviderProps {
  /** Tema inicial quando o dispositivo ainda não tem preferência guardada (vem de User.theme). */
  defaultTheme?: NextTheme;
  children: ReactNode;
}

export function ThemeProvider({ defaultTheme = 'light', children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme={defaultTheme}
      enableSystem
      themes={['light', 'dark']}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
