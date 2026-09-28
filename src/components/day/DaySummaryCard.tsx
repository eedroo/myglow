'use client';

import { useTranslations } from 'next-intl';
import { GlassCard } from '@/components/ui/GlassCard';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';

interface DaySummaryCardProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function DaySummaryCard({ value, onChange, onBlur }: DaySummaryCardProps) {
  const t = useTranslations('day.summary');
  return (
    <GlassCard>
      <div className="mg-reflection mg-reflection--summary">
        <div className="mg-reflection__body">
          <label htmlFor="day-summary" className="mg-reflection__head">
            <MagicIcon name="journal" size="sm" decorative />
            <span className="mg-reflection__title">{t('title')}</span>
          </label>
          <LinedTextArea
            id="day-summary"
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
