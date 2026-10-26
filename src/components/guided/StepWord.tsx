'use client';

import { useEffect, useRef } from 'react';

/** Palavra do ano: uma linha em tipografia grande. */
export function StepWord({ title, help, value, onChange, onBlur, placeholder }: { title: string; help: string; value: string; onChange: (v: string) => void; onBlur: () => void; placeholder: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="mg-step mg-step-word">
      <label htmlFor="guided-word" className="mg-step__title">
        {title}
      </label>
      <p className="mg-step__help">{help}</p>
      <input ref={ref} id="guided-word" className="mg-step-word__input" value={value} maxLength={40} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
    </div>
  );
}
