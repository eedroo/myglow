'use client';

import { useTranslations } from 'next-intl';
import { GlassCard } from '@/components/ui/GlassCard';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { Button } from '@/components/ui/Button';

interface IntentionCardProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  /** Intenção sugerida pela leitura do dia (placeholder + "Usar sugestão"). */
  suggestion?: string;
}

export function IntentionCard({ value, onChange, onBlur, suggestion }: IntentionCardProps) {
  const t = useTranslations('day.intention');
  const tr = useTranslations('reading');
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
        placeholder={suggestion || t('placeholder')}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {suggestion && !value.trim() && (
        <Button
          variant="subtle"
          className="mg-intention__use"
          onClick={() => {
            onChange(suggestion);
            onBlur();
          }}
        >
          <MagicIcon name="sparkles" size="sm" decorative />
          {tr('useSuggestion')}
        </Button>
      )}
    </GlassCard>
  );
}
