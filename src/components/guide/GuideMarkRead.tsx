'use client';

import { useEffect } from 'react';
import { markGuideRead } from '@/actions/guide';

/** Marca a leitura como lida quando aparece no ecrã (o histórico deixa de mostrar "por ler"). */
export function GuideMarkRead({ kind, periodKey }: { kind: 'WEEK' | 'MONTH'; periodKey: string }) {
  useEffect(() => {
    void markGuideRead(kind, periodKey);
  }, [kind, periodKey]);
  return null;
}
