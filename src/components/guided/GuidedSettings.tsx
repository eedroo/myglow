'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { setGuidedAutoOpen } from '@/actions/guided';
import { CheckChip } from '@/components/ui/CheckChip';

/** Definições → Diário: abrir o Hoje no modo guiado (desligado por defeito). */
export function GuidedSettings({ autoOpen }: { autoOpen: boolean }) {
  const t = useTranslations('guided.settings');
  const [on, setOn] = useState(autoOpen);
  const [, start] = useTransition();
  return (
    <div className="mg-form__row">
      <CheckChip
        icon="sparkles"
        label={t('autoOpen')}
        checked={on}
        onCheckedChange={(v) => {
          setOn(v);
          start(async () => void (await setGuidedAutoOpen(v)));
        }}
      />
      <p className="mg-form__status">{t('autoOpenHint')}</p>
    </div>
  );
}
