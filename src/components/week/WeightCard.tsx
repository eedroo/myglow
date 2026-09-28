'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { WeightInput } from '@/components/ui/WeightInput';
import { formatDeltaKg } from '@/lib/weight';

interface WeightCardProps {
  grams: number | null;
  previousGrams: number | null;
  onCommit: (grams: number | null) => void;
}

/** Peso da semana em kg + diferença (neutra) face à semana anterior. */
export function WeightCard({ grams, previousGrams, onCommit }: WeightCardProps) {
  const t = useTranslations('weight');
  const locale = useLocale();
  const [invalid, setInvalid] = useState(false);
  const delta = grams !== null && previousGrams !== null ? grams - previousGrams : null;

  return (
    <GlassCard className="mg-weight">
      <label htmlFor="week-weight" className="mg-weight__head">
        <MagicIcon name="scale" size="sm" decorative />
        {t('title')}
        <span className="mg-visually-hidden">{t('label')}</span>
      </label>
      <WeightInput
        id="week-weight"
        grams={grams}
        locale={locale}
        unitLabel={t('unit')}
        placeholder={t('placeholder')}
        invalid={invalid}
        describedBy={invalid ? 'week-weight-error' : delta !== null ? 'week-weight-delta' : undefined}
        onInvalid={setInvalid}
        onCommit={onCommit}
      />
      {invalid && (
        <p id="week-weight-error" className="mg-field__error" role="alert">
          {t('invalid')}
        </p>
      )}
      {!invalid && delta !== null && (
        <p id="week-weight-delta" className="mg-weight__delta">
          {t('delta', { delta: formatDeltaKg(delta, locale) })}
        </p>
      )}
    </GlassCard>
  );
}
