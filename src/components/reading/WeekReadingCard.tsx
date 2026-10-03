import { getTranslations } from 'next-intl/server';
import type { AiRequest, AiState } from '@/lib/ai/queries';
import type { WeekPersonal } from '@/lib/ai/schemas';
import { PeriodReadingCard } from './PeriodReadingCard';

interface WeekReadingCardProps {
  personal: AiState<WeekPersonal>;
  pending: AiRequest[];
}

/** Leitura pessoal da semana (a energia por signo ficou só no mês). */
export async function WeekReadingCard({ personal, pending }: WeekReadingCardProps) {
  const t = await getTranslations('reading.week');
  return (
    <PeriodReadingCard
      id="week-reading"
      title={t('title')}
      signTitle=""
      personalTitle={t('personalTitle')}
      datesTitle={t('highlights')}
      sign={null}
      personal={personal.status === 'ready' ? personal.data : null}
      pending={pending}
      waiting={personal.status === 'pending'}
    />
  );
}
