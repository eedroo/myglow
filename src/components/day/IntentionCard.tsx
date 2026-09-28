'use client';

import { useTranslations } from 'next-intl';
import { GlassCard } from '@/components/ui/GlassCard';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';

interface IntentionCardProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function IntentionCard({ value, onChange, onBlur }: IntentionCardProps) {
  const t = useTranslations('day.intention');
  return (
    <GlassCard className="mg-intention">
      <label htmlFor="day-intention" className="mg-intention__head">
        <MagicIcon name="sparkles" size="sm" decorative />
        <span className="mg-intention__label">{t('label')}</span>
      </label>
      <LinedTextArea
        id="day-intention"
        rows={3}
        maxLength={500}
        value={value}
        placeholder={t('placeholder')}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </GlassCard>
  );
}
