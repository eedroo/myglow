'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

/** "Quer ver a sua leitura de hoje?": Ver mostra-a no passo (com scroll); Agora não avança. */
export function StepReading({
  title,
  show,
  skip,
  pending,
  onSkip,
  children,
  openByDefault = false,
}: {
  title: string;
  show: string;
  skip: string;
  pending: boolean;
  onSkip: () => void;
  children: ReactNode;
  /** Planear (F18): a leitura do período aparece logo, antes de planear. */
  openByDefault?: boolean;
}) {
  const [open, setOpen] = useState(openByDefault);
  return (
    <div className={`mg-step mg-step-reading${pending ? ' mg-step-reading--pending' : ''}`}>
      <h2 className="mg-step__title">{title}</h2>
      {open ? (
        <div className="mg-step-reading__content">{children}</div>
      ) : (
        <div className="mg-step__actions">
          <Button onClick={() => setOpen(true)}>{show}</Button>
          <Button variant="ghost" onClick={onSkip}>
            {skip}
          </Button>
        </div>
      )}
    </div>
  );
}
