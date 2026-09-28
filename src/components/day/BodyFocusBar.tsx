'use client';

import { useTranslations } from 'next-intl';
import { CheckChip } from '@/components/ui/CheckChip';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { DailyEntryData, DailyField } from '@/types/daily';

interface BodyFocusBarProps {
  data: DailyEntryData;
  setField: <K extends DailyField>(key: K, value: DailyEntryData[K]) => void;
  current: boolean;
}

export function BodyFocusBar({ data, setField, current }: BodyFocusBarProps) {
  const t = useTranslations('day.body');
  return (
    <section
      className={current ? 'mg-body-bar mg-body-bar--current' : 'mg-body-bar'}
      aria-labelledby="body-bar-title"
    >
      <h2 id="body-bar-title" className="mg-body-bar__label">
        <MagicIcon name="sparkles" size="sm" decorative />
        {t('title')}
      </h2>
      <div className="mg-body-bar__chips">
        <CheckChip icon="stretch" label={t('stretch')} checked={data.stretchDone} onCheckedChange={(v) => setField('stretchDone', v)} />
        <CheckChip icon="dumbbell" label={t('workout')} checked={data.workoutDone} onCheckedChange={(v) => setField('workoutDone', v)} />
        <CheckChip icon="water-drop" label={t('water')} checked={data.waterDone} onCheckedChange={(v) => setField('waterDone', v)} />
      </div>
    </section>
  );
}
