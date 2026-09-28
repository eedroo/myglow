'use client';

import { useTranslations } from 'next-intl';
import { GlassCard } from '@/components/ui/GlassCard';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';

interface WeekIntentionCardProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function WeekIntentionCard({ value, onChange, onBlur }: WeekIntentionCardProps) {
  const t = useTranslations('week.intention');
  return (
    <GlassCard className="mg-intention">
      <label htmlFor="week-intention" className="mg-intention__head">
        <MagicIcon name="sparkles" size="sm" decorative />
        <span className="mg-intention__label">{t('label')}</span>
      </label>
      <LinedTextArea
        id="week-intention"
        rows={3}
        maxLength={1000}
        value={value}
        placeholder={t('placeholder')}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </GlassCard>
  );
}
