'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { formatDeltaKg, formatGramsAsKg } from '@/lib/weight';

/** F17 (body-pro): média do peso diário da semana, só leitura, com o nº de pesagens e link para o peso. */
export function WeekWeightAverage({ avgGrams, count, previousAvgGrams }: { avgGrams: number; count: number; previousAvgGrams: number | null }) {
  const t = useTranslations('weight');
  const locale = useLocale();
  return (
    <GlassCard className="mg-weight">
      <div className="mg-week-weight-avg">
        <span className="mg-weight__head">
          <MagicIcon name="scale" size="sm" decorative />
          {t('averageTitle')}
        </span>
        <span className="mg-week-weight-avg__value">{t('kgValue', { kg: formatGramsAsKg(avgGrams, locale) })}</span>
        <span className="mg-week-weight-avg__meta">
          {t('fromWeighIns', { n: count })}
          {previousAvgGrams != null && ` · ${t('delta', { delta: formatDeltaKg(avgGrams - previousAvgGrams, locale) })}`}
        </span>
        <Link href="/body/weight">{t('openWeight')}</Link>
      </div>
    </GlassCard>
  );
}
