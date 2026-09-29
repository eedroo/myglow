import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { formatDayMonth } from '@/lib/dates';
import type { AppLocale } from '@/i18n/locales';
import type { Ritual } from '@/lib/ai/schemas';
import { RitualSheet } from './RitualSheet';

/** Ritual do mês marcado para este dia. */
export async function RitualTodayCard({ ritual, locale }: { ritual: Ritual; locale: AppLocale }) {
  const t = await getTranslations('reading.ritual');
  const year = Number(ritual.date.slice(0, 4));
  const month = Number(ritual.date.slice(5, 7));
  return (
    <GlassCard variant="accent" className="mg-ritual-today">
      <span className="mg-ritual-today__icon">
        <MagicIcon name="candle" size="lg" decorative />
      </span>
      <div className="mg-ritual-today__body">
        <p className="mg-ritual-today__eyebrow">{t('today')}</p>
        <h2 className="mg-ritual-today__title">{ritual.title}</h2>
        <p className="mg-ritual-today__meta">
          {ritual.occasion} · {t('duration', { n: ritual.durationMinutes })}
        </p>
      </div>
      <RitualSheet ritual={ritual} year={year} month={month} dateLabel={formatDayMonth(ritual.date, locale)} triggerVariant="button">
        {t('open')}
      </RitualSheet>
    </GlassCard>
  );
}
