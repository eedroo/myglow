'use client';

import { useTranslations } from 'next-intl';
import { GlassCard } from '@/components/ui/GlassCard';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { MoodScale } from '@/components/ui/MoodScale';

export type MoodLabels = [string, string, string, string, string];

interface GratitudeMoodCardProps {
  gratitude: string;
  mood: number | null;
  onGratitudeChange: (value: string) => void;
  onGratitudeBlur: () => void;
  onMoodChange: (value: number) => void;
  /** F9: humor só com consentimento de bem-estar. */
  showMood?: boolean;
}

export function GratitudeMoodCard(props: GratitudeMoodCardProps) {
  const t = useTranslations('day');
  const labels = t.raw('moodLabels') as MoodLabels;
  return (
    <GlassCard className="mg-gratitude">
      <div className="mg-gratitude__block">
        <label htmlFor="day-gratitude" className="mg-gratitude__head">
          <MagicIcon name="heart" size="sm" decorative />
          <span className="mg-gratitude__label">{t('gratitude.title')}</span>
        </label>
        <LinedTextArea
          id="day-gratitude"
          rows={3}
          maxLength={2000}
          value={props.gratitude}
          placeholder={t('gratitude.placeholder')}
          onChange={(e) => props.onGratitudeChange(e.target.value)}
          onBlur={props.onGratitudeBlur}
        />
      </div>
      {props.showMood !== false && (
        <div className="mg-gratitude__block mg-gratitude__block--mood">
          <span className="mg-gratitude__head" aria-hidden="true">
            <MagicIcon name="thermometer" size="sm" decorative />
          </span>
          <MoodScale name="day-mood" legend={t('gratitude.mood')} labels={labels} value={props.mood} onChange={props.onMoodChange} />
        </div>
      )}
    </GlassCard>
  );
}
