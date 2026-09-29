'use client';

import { useTranslations } from 'next-intl';
import { GlassCard } from '@/components/ui/GlassCard';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';

interface ReflectionCardProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  /** Pergunta de reflexão da leitura do dia (substitui o subtítulo fixo). */
  hint?: string;
}

export function ReflectionCard({ value, onChange, onBlur, hint }: ReflectionCardProps) {
  const t = useTranslations('day.reflection');
  return (
    <GlassCard>
      <div className="mg-reflection">
        <div className="mg-reflection__body">
          <label htmlFor="day-reflection" className="mg-reflection__head">
            <MagicIcon name="moon-stars" size="sm" decorative />
            <span className="mg-reflection__title">{t('title')}</span>
          </label>
          <p id="day-reflection-hint" className="mg-reflection__subtitle">
            {hint || t('subtitle')}
          </p>
          <LinedTextArea
            id="day-reflection"
            rows={3}
            maxLength={4000}
            value={value}
            aria-describedby="day-reflection-hint"
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
