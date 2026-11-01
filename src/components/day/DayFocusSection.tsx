'use client';

import type { ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';

interface DayFocusSectionProps {
  id: string;
  icon: MagicIconName;
  title: string;
  /** "Feito", "Por fazer", "2 de 3"… */
  status: string;
  done: boolean;
  /** Período actual (só hoje): a secção fica realçada. */
  current?: boolean;
  /** Botão do passo a passo, no topo da secção aberta. */
  action?: ReactNode;
  tour?: string;
  children: ReactNode;
}

/** Uma das três partes do dia (Manhã, Corpo, Noite), recolhida; ao tocar abre por baixo, na mesma página. */
export function DayFocusSection({ id, icon, title, status, done, current = false, action, tour, children }: DayFocusSectionProps) {
  const cls = ['mg-day-focus', current && 'mg-day-focus--current', done && 'mg-day-focus--done'].filter(Boolean).join(' ');
  return (
    <details className={cls} id={id} data-tour={tour}>
      <summary className="mg-day-focus__summary">
        <span className="mg-day-focus__icon" aria-hidden="true">
          <MagicIcon name={icon} size="sm" decorative />
        </span>
        <span className="mg-day-focus__title">{title}</span>
        <span className="mg-day-focus__status">
          {done && <Check size={14} strokeWidth={2} aria-hidden="true" />}
          {status}
        </span>
        <ChevronDown className="mg-day-focus__chevron" size={18} aria-hidden="true" />
      </summary>
      <div className="mg-day-focus__body">
        {action && <div className="mg-day-focus__actions">{action}</div>}
        {children}
      </div>
    </details>
  );
}
