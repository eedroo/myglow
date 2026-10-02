'use client';

import { useTranslations } from 'next-intl';
import { CheckTile } from '@/components/ui/CheckTile';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { DailyEntryData, DailyField } from '@/types/daily';

interface MorningSectionProps {
  data: DailyEntryData;
  setField: <K extends DailyField>(key: K, value: DailyEntryData[K]) => void;
  onTextBlur: () => void;
  sleepGoalMinutes: number;
  current: boolean;
  /** Banimento sugerido pela leitura do dia (placeholder). */
  banishSuggestion?: string;
  /** F9: sono só com consentimento de bem-estar. */
  showSleep?: boolean;
}

export function MorningSection({ data, setField, onTextBlur, sleepGoalMinutes, current, banishSuggestion, showSleep = true }: MorningSectionProps) {
  const t = useTranslations('day');
  return (
    <section className={current ? 'mg-period mg-period--morning mg-period--current' : 'mg-period mg-period--morning'}>
      <SectionHeader title={t('morning.title')} icon="sun" />
      <CheckTile
        icon="tea-cup"
        label={t('morning.banish')}
        withText
        text={data.morningBanishName}
        textLabel={t('morning.banishName')}
        textPlaceholder={banishSuggestion || t('morning.banishPlaceholder')}
        textMaxLength={80}
        onTextChange={(v) => setField('morningBanishName', v)}
        onTextBlur={onTextBlur}
        checked={data.morningBanishDone}
        checkLabel={t('done')}
        onCheckedChange={(v) => setField('morningBanishDone', v)}
      />
      <CheckTile
        icon="lotus"
        label={t('morning.ritual')}
        checked={data.morningRitualDone}
        checkLabel={t('done')}
        onCheckedChange={(v) => setField('morningRitualDone', v)}
      />
      {showSleep && (
        <CheckTile
          icon="bed"
          label={t('morning.sleep', { hours: sleepGoalMinutes / 60 })}
          checked={data.sleepGoalMet}
          checkLabel={t('done')}
          onCheckedChange={(v) => setField('sleepGoalMet', v)}
        />
      )}
    </section>
  );
}
