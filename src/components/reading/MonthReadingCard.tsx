import { getTranslations } from 'next-intl/server';
import { formatDayMonth } from '@/lib/dates';
import type { AppLocale } from '@/i18n/locales';
import type { AiRequest, AiState } from '@/lib/ai/queries';
import type { MonthEnergy, MonthPersonal } from '@/lib/ai/schemas';
import { PeriodReadingCard } from './PeriodReadingCard';

interface MonthReadingCardProps {
  energy: AiState<MonthEnergy>;
  personal: AiState<MonthPersonal>;
  pending: AiRequest[];
  signLabel: string | null;
  locale: AppLocale;
}

/** Energia do mês (signo) + leitura pessoal + datas-chave. */
export async function MonthReadingCard({ energy, personal, pending, signLabel, locale }: MonthReadingCardProps) {
  const t = await getTranslations('reading.month');
  const e = energy.status === 'ready' ? energy.data : null;
  const p = personal.status === 'ready' ? personal.data : null;
  return (
    <PeriodReadingCard
      id="month-reading"
      title={t('title')}
      signTitle={t('signTitle', { sign: signLabel ?? '' })}
      personalTitle={t('personalTitle')}
      datesTitle={t('keyDates')}
      sign={
        e && {
          headline: e.headline,
          overview: e.overview,
          dates: e.keyDates.map((k) => ({ date: k.date, label: formatDayMonth(k.date, locale), note: k.note })),
        }
      }
      personal={p}
      pending={pending}
      waiting={energy.status === 'pending' || personal.status === 'pending'}
    />
  );
}
