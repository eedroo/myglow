'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { prefToNextTheme, type ThemePref } from '@/lib/theme';

interface ThemeSyncProps {
  /** `theme` da sessão (User.theme). */
  theme: ThemePref;
}

/** Ao montar, aplica o tema da sessão se for diferente do deste dispositivo (sincroniza entre dispositivos). */
export function ThemeSync({ theme }: ThemeSyncProps) {
  const { theme: current, setTheme } = useTheme();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current || current === undefined) return;
    synced.current = true;
    const wanted = prefToNextTheme(theme);
    if (current !== wanted) setTheme(wanted);
  }, [current, theme, setTheme]);

  return null;
}
