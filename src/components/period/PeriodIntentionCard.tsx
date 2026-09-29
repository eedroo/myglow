'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';

interface PeriodIntentionCardProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  rows?: number;
  maxLength?: number;
}

/** Intenção de um período (semana, mês, ano): sparkles + label + caderno pautado. */
export function PeriodIntentionCard({ id, label, placeholder, value, onChange, onBlur, rows = 3, maxLength = 1000 }: PeriodIntentionCardProps) {
  return (
    <GlassCard className="mg-intention">
      <label htmlFor={id} className="mg-intention__head">
        <MagicIcon name="sparkles" size="sm" decorative />
        <span className="mg-intention__label">{label}</span>
      </label>
      <LinedTextArea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </GlassCard>
  );
}
