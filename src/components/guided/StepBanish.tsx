'use client';

import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

/** "O que você quer soltar?": nome do banimento e um "Feito" grande. */
export function StepBanish({
  id,
  title,
  help,
  name,
  done,
  placeholder,
  doneLabel,
  onName,
  onDone,
  onBlur,
}: {
  id: string;
  title: string;
  help: string;
  name: string;
  done: boolean;
  placeholder: string;
  doneLabel: string;
  onName: (v: string) => void;
  onDone: (v: boolean) => void;
  onBlur: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="mg-step mg-step-banish">
      <label htmlFor={id} className="mg-step__title">
        {title}
      </label>
      <p className="mg-step__help">{help}</p>
      <input ref={ref} id={id} className="mg-step-banish__input" value={name} maxLength={80} placeholder={placeholder} onChange={(e) => onName(e.target.value)} onBlur={onBlur} />
      <button type="button" className={`mg-step-toggle${done ? ' mg-step-toggle--on' : ''}`} aria-pressed={done} onClick={() => onDone(!done)}>
        <Check size={22} aria-hidden="true" />
        {doneLabel}
      </button>
    </div>
  );
}
