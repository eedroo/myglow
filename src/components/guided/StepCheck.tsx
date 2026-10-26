'use client';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';

/** Um check grande: ícone, pergunta e botão de alternar; `extra` mostra o ritual sugerido. */
export function StepCheck({
  icon,
  title,
  help,
  value,
  doneLabel,
  onToggle,
  extra,
}: {
  icon: MagicIconName;
  title: string;
  help?: string;
  value: boolean;
  doneLabel: string;
  onToggle: (v: boolean) => void;
  extra?: ReactNode;
}) {
  return (
    <div className="mg-step mg-step-check">
      <span className="mg-step-check__icon">
        <MagicIcon name={icon} size="xl" decorative />
      </span>
      <h2 className="mg-step__title">{title}</h2>
      {help && <p className="mg-step__help">{help}</p>}
      {extra && <div className="mg-step-check__extra">{extra}</div>}
      <button type="button" className={`mg-step-toggle${value ? ' mg-step-toggle--on' : ''}`} aria-pressed={value} onClick={() => onToggle(!value)}>
        <Check size={22} aria-hidden="true" />
        {doneLabel}
      </button>
    </div>
  );
}
