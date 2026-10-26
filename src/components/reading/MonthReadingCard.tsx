import { getTranslations } from 'next-intl/server';
import type { AiRequest, AiState } from '@/lib/ai/queries';
import type { MonthPersonal } from '@/lib/ai/schemas';
import { PeriodReadingCard } from './PeriodReadingCard';

interface MonthReadingCardProps {
  personal: AiState<MonthPersonal>;
  pending: AiRequest[];
}

/** Leitura pessoal do mês (a energia do signo saiu na F18: só leituras pessoais). */
export async function MonthReadingCard({ personal, pending }: MonthReadingCardProps) {
  const t = await getTranslations('reading.month');
  const p = personal.status === 'ready' ? personal.data : null;
  return (
    <PeriodReadingCard
      id="month-reading"
      title={t('title')}
      signTitle=""
      personalTitle={t('personalTitle')}
      datesTitle={t('keyDates')}
      sign={null}
      personal={p}
      pending={pending}
      waiting={personal.status === 'pending'}
    />
  );
}
