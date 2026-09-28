'use client';

import { useTranslations } from 'next-intl';
import { Field } from '@/components/ui/Field';
import { GlassCard } from '@/components/ui/GlassCard';
import { MoodScale } from '@/components/ui/MoodScale';
import { TextInput } from '@/components/ui/TextInput';
import type { MoodLabels } from './GratitudeMoodCard';

interface WakeMoodCardProps {
  mood: number | null;
  note: string;
  onMoodChange: (value: number) => void;
  onNoteChange: (value: string) => void;
  onNoteBlur: () => void;
}

export function WakeMoodCard({ mood, note, onMoodChange, onNoteChange, onNoteBlur }: WakeMoodCardProps) {
  const t = useTranslations('day');
  const labels = t.raw('moodLabels') as MoodLabels;
  return (
    <GlassCard className="mg-wake">
      <MoodScale name="wake-mood" legend={t('wake.title')} labels={labels} value={mood} onChange={onMoodChange} />
      <Field id="wake-note" label={t('wake.note')}>
        <TextInput
          id="wake-note"
          value={note}
          maxLength={500}
          placeholder={t('wake.notePlaceholder')}
          onChange={(e) => onNoteChange(e.target.value)}
          onBlur={onNoteBlur}
        />
      </Field>
    </GlassCard>
  );
}
