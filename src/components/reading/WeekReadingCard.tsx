import { getTranslations } from 'next-intl/server';
import { formatDayMonth } from '@/lib/dates';
import type { AppLocale } from '@/i18n/locales';
import type { AiRequest, AiState } from '@/lib/ai/queries';
import type { WeekEnergy, WeekPersonal } from '@/lib/ai/schemas';
import { PeriodReadingCard } from './PeriodReadingCard';

interface WeekReadingCardProps {
  energy: AiState<WeekEnergy>;
  personal: AiState<WeekPersonal>;
  pending: AiRequest[];
  signLabel: string | null;
  locale: AppLocale;
}

/** Energia da semana (signo) + leitura pessoal + destaques por data. */
export async function WeekReadingCard({ energy, personal, pending, signLabel, locale }: WeekReadingCardProps) {
  const t = await getTranslations('reading.week');
  const e = energy.status === 'ready' ? energy.data : null;
  const p = personal.status === 'ready' ? personal.data : null;
  return (
    <PeriodReadingCard
      id="week-reading"
      title={t('title')}
      signTitle={t('signTitle', { sign: signLabel ?? '' })}
      personalTitle={t('personalTitle')}
      datesTitle={t('highlights')}
      sign={
        e && {
          headline: e.headline,
          overview: e.overview,
          dates: e.highlights.map((h) => ({ date: h.date, label: formatDayMonth(h.date, locale), note: h.note })),
        }
      }
      personal={p}
      pending={pending}
      waiting={energy.status === 'pending' || personal.status === 'pending'}
    />
  );
}
