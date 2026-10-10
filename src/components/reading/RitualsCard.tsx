import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconBadge } from '@/components/ui/IconBadge';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { formatDayMonth } from '@/lib/dates';
import { PROJECT_ICONS } from '@/lib/icons';
import type { AppLocale } from '@/i18n/locales';
import type { AiRequest, AiState } from '@/lib/ai/queries';
import type { MonthRituals } from '@/lib/ai/schemas';
import { ReadingPending } from './ReadingPending';
import { RitualSheet } from './RitualSheet';

interface RitualsCardProps {
  rituals: AiState<MonthRituals>;
  pending: AiRequest[];
  year: number;
  month: number;
  locale: AppLocale;
}

/** Rituais sugeridos do mês (3–5), cada um abre o `RitualSheet`. */
export async function RitualsCard({ rituals, pending, year, month, locale }: RitualsCardProps) {
  const t = await getTranslations('reading');
  const tp = await getTranslations('projects');
  if (rituals.status === 'unavailable') return null;

  return (
    <GlassCard
      className="mg-rituals"
      title={t('rituals.title')}
      header={
        <IconBadge size="md">
          <MagicIcon name="candle" size="md" decorative />
        </IconBadge>
      }
    >
      {rituals.status === 'pending' ? (
        <ReadingPending requests={pending} />
      ) : (
        <>
          {/* Rituais gerados com prompts antigos: mostram-se enquanto a versão nova é pedida. */}
          {pending.length > 0 && <ReadingPending requests={pending} silent />}
          <p className="mg-rituals__subtitle">{t('rituals.subtitle')}</p>
          <ul className="mg-rituals__list">
            {rituals.data.rituals.map((r) => {
              const dateLabel = formatDayMonth(r.date, locale);
              return (
                <li key={r.id}>
                  <RitualSheet ritual={r} year={year} month={month} dateLabel={dateLabel}>
                    <time className="mg-rituals__date" dateTime={r.date}>
                      {dateLabel}
                    </time>
                    <span className="mg-rituals__body">
                      <span className="mg-rituals__title">{r.title}</span>
                      <span className="mg-rituals__meta">
                        {r.occasion} · {t('ritual.duration', { n: r.durationMinutes })}
                      </span>
                    </span>
                    <span className="mg-rituals__icon" title={tp(`areas.${r.area}`)}>
                      <MagicIcon name={PROJECT_ICONS[r.area]} size="sm" decorative />
                      <span className="mg-visually-hidden">{tp(`areas.${r.area}`)}</span>
                    </span>
                  </RitualSheet>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </GlassCard>
  );
}
