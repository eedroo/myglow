'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/** Identifica os erros no Sentry só pelo id interno (nunca email nem nome). */
export function SentryUser({ id }: { id: string }) {
  useEffect(() => {
    Sentry.setUser({ id });
    return () => Sentry.setUser(null);
  }, [id]);
  return null;
}
