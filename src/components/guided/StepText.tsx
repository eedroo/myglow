'use client';

import { useEffect, useRef } from 'react';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';

/** Título, ajuda e uma caixa de texto grande com foco automático; contador discreto perto do limite. */
export function StepText({
  id,
  title,
  help,
  value,
  onChange,
  onBlur,
  maxLength,
  placeholder,
  area,
}: {
  id: string;
  title: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  maxLength: number;
  placeholder?: string;
  area?: { icon: MagicIconName; name: string };
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  const near = value.length > maxLength * 0.8;
  return (
    <div className="mg-step mg-step-text">
      {area && (
        <p className="mg-step-text__area">
          <MagicIcon name={area.icon} size="sm" decorative />
          {area.name}
        </p>
      )}
      <label htmlFor={id} className="mg-step__title">
        {title}
      </label>
      <p className="mg-step__help" id={`${id}-help`}>
        {help}
      </p>
      <textarea
        ref={ref}
        id={id}
        className="mg-step-text__input"
        rows={5}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-describedby={`${id}-help`}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {near && (
        <span className="mg-step-text__count" aria-live="polite">
          {value.length}/{maxLength}
        </span>
      )}
    </div>
  );
}
