'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';

interface PeriodReflectionCardProps {
  id: string;
  label: string;
  hint?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  rows?: number;
  maxLength?: number;
}

/** Reflexão de um período: moon-stars + label + caderno pautado + cristal decorativo. */
export function PeriodReflectionCard({
  id, label, hint, placeholder, value, onChange, onBlur, rows = 4, maxLength = 4000,
}: PeriodReflectionCardProps) {
  return (
    <GlassCard>
      <div className="mg-reflection">
        <div className="mg-reflection__body">
          <label htmlFor={id} className="mg-reflection__head">
            <MagicIcon name="moon-stars" size="sm" decorative />
            <span className="mg-reflection__title">{label}</span>
          </label>
          {hint && (
            <p id={`${id}-hint`} className="mg-reflection__subtitle">
              {hint}
            </p>
          )}
          <LinedTextArea
            id={id}
            rows={rows}
            maxLength={maxLength}
            value={value}
            placeholder={placeholder}
            aria-describedby={hint ? `${id}-hint` : undefined}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
          />
        </div>
        <span className="mg-reflection__crystal">
          <MagicIcon name="crystal-cluster" size="xl" decorative />
        </span>
      </div>
    </GlassCard>
  );
}
