'use client';

import { useTranslations } from 'next-intl';
import { GlassCard } from '@/components/ui/GlassCard';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';

interface WeekReflectionCardProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function WeekReflectionCard({ value, onChange, onBlur }: WeekReflectionCardProps) {
  const t = useTranslations('week.reflection');
  return (
    <GlassCard>
      <div className="mg-reflection">
        <div className="mg-reflection__body">
          <label htmlFor="week-reflection" className="mg-reflection__head">
            <MagicIcon name="moon-stars" size="sm" decorative />
            <span className="mg-reflection__title">{t('title')}</span>
          </label>
          <LinedTextArea
            id="week-reflection"
            rows={4}
            maxLength={4000}
            value={value}
            placeholder={t('placeholder')}
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
