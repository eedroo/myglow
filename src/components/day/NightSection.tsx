'use client';

import { useTranslations } from 'next-intl';
import { CheckTile } from '@/components/ui/CheckTile';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { DailyEntryData, DailyField } from '@/types/daily';
import { GuidedSectionButton } from '@/components/guided/GuidedSectionButton';

interface NightSectionProps {
  data: DailyEntryData;
  setField: <K extends DailyField>(key: K, value: DailyEntryData[K]) => void;
  onTextBlur: () => void;
  current: boolean;
  /** F18: base das rotas do modo guiado deste dia (só hoje e ontem). */
  guidedBase?: string | null;
}

export function NightSection({ data, setField, onTextBlur, current, guidedBase }: NightSectionProps) {
  const t = useTranslations('day');
  return (
    <section className={current ? 'mg-period mg-period--night mg-period--current' : 'mg-period mg-period--night'} data-tour="night-section">
      <SectionHeader
        title={t('night.title')}
        icon="moon-crescent"
        action={guidedBase ? <GuidedSectionButton href={`${guidedBase}/night`} label={t('guidedNight')} /> : undefined}
      />
      <CheckTile
        icon="feather"
        label={t('night.banish')}
        withText
        text={data.nightBanishName}
        textLabel={t('night.banishName')}
        textPlaceholder={t('night.banishPlaceholder')}
        textMaxLength={80}
        onTextChange={(v) => setField('nightBanishName', v)}
        onTextBlur={onTextBlur}
        checked={data.nightBanishDone}
        checkLabel={t('done')}
        onCheckedChange={(v) => setField('nightBanishDone', v)}
      />
      <CheckTile
        icon="crystal-ball"
        label={t('night.ritual')}
        checked={data.nightRitualDone}
        checkLabel={t('done')}
        onCheckedChange={(v) => setField('nightRitualDone', v)}
      />
    </section>
  );
}
