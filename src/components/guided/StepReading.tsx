'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

/**
 * Manhã: "Quer a sua leitura agora ou à noite?" (grava a escolha do dia): agora mostra-a no passo (com scroll);
 * à noite avança e ela aparece no fecho do dia. Já escolhida "à noite": lembra que espera, com "Ver agora".
 * Planear: a leitura do período aparece logo (`openByDefault`).
 */
export function StepReading({
  title,
  show,
  skip,
  pending,
  onSkip,
  children,
  openByDefault = false,
  initialChoice = null,
  onChoose,
  waiting,
}: {
  title: string;
  show: string;
  skip: string;
  pending: boolean;
  onSkip: () => void;
  children: ReactNode;
  openByDefault?: boolean;
  initialChoice?: 'NOW' | 'NIGHT' | null;
  onChoose?: (c: 'NOW' | 'NIGHT') => void;
  waiting?: { text: string; showNow: string };
}) {
  const [open, setOpen] = useState(openByDefault || initialChoice === 'NOW');
  const [later, setLater] = useState(initialChoice === 'NIGHT');
  const now = () => {
    setOpen(true);
    setLater(false);
    onChoose?.('NOW');
  };
  return (
    <div className={`mg-step mg-step-reading${pending ? ' mg-step-reading--pending' : ''}`}>
      <h2 className="mg-step__title">{title}</h2>
      {open ? (
        <div className="mg-step-reading__content">{children}</div>
      ) : later && waiting ? (
        <>
          <p className="mg-step__help">{waiting.text}</p>
          <div className="mg-step__actions">
            <Button variant="ghost" onClick={now}>
              {waiting.showNow}
            </Button>
          </div>
        </>
      ) : (
        <div className="mg-step__actions">
          <Button onClick={now}>{show}</Button>
          <Button
            variant="subtle"
            onClick={() => {
              setLater(true);
              onChoose?.('NIGHT');
              onSkip();
            }}
          >
            {skip}
          </Button>
        </div>
      )}
    </div>
  );
}
