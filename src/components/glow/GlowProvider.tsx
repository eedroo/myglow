'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { XpSource } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { markLevelSeen } from '@/actions/glow';
import type { XpResult } from '@/lib/xp/award';
import { GlowToast } from './GlowToast';
import { LevelUpDialog } from './LevelUpDialog';

interface GlowContextValue {
  push: (xp: XpResult) => void;
}

const NOOP: GlowContextValue = { push: () => undefined };
const GlowContext = createContext<GlowContextValue>(NOOP);

/** Fora do provider (ex.: /dev/ui) devolve um no-op. */
export function useGlow(): GlowContextValue {
  return useContext(GlowContext);
}

const TOAST_MS = 3000;

interface ToastItem {
  id: number;
  points: number;
  sources: XpSource[];
}

interface GlowProviderProps {
  level: number;
  levelSeen: number;
  children: ReactNode;
}

/** Toasts de Glow, diálogo de subida de nível e refresh do badge/notas depois de ganhar Glow. */
export function GlowProvider({ level, levelSeen, children }: GlowProviderProps) {
  const router = useRouter();
  const [queue, setQueue] = useState<ToastItem[]>([]);
  // Abre também ao carregar se a subida aconteceu noutro dispositivo ou com a app fechada.
  const [dialogLevel, setDialogLevel] = useState<number | null>(level > levelSeen ? level : null);
  const nextId = useRef(1);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback(
    (xp: XpResult) => {
      const points = xp.awards.reduce((s, a) => s + a.points, 0);
      if (points > 0) {
        setQueue((q) => [...q, { id: nextId.current++, points, sources: xp.awards.map((a) => a.source) }]);
      }
      if (xp.levelUp) setDialogLevel(xp.level);
      // Actualiza badge da TopBar e notas de janela (agrupado para não refrescar a cada tecla).
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 800);
    },
    [router],
  );

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setQueue((q) => q.slice(1)), TOAST_MS);
    return () => clearTimeout(timer);
  }, [current]);

  useEffect(() => () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogLevel(null);
    void markLevelSeen().then(() => router.refresh());
  }, [router]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <GlowContext.Provider value={value}>
      {children}
      {current && <GlowToast key={current.id} points={current.points} sources={current.sources} />}
      {dialogLevel !== null && <LevelUpDialog level={dialogLevel} open onClose={closeDialog} />}
    </GlowContext.Provider>
  );
}
