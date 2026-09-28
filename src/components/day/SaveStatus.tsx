'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SaveStatus as Status } from '@/hooks/useDailyAutosave';

const SAVED_VISIBLE_MS = 2000;

/** Indicador discreto de gravação, fixo por baixo da TopBar. */
export function SaveStatus({ status }: { status: Status }) {
  const t = useTranslations('day.save');
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (status !== 'saved') return;
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), SAVED_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const visible = status === 'saving' || status === 'offline' || status === 'error' || (status === 'saved' && showSaved);
  const text = status === 'idle' ? '' : t(status);

  return (
    <div
      className={['mg-save-status', `mg-save-status--${status}`, visible && 'mg-save-status--visible'].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className="mg-save-status__dot" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
