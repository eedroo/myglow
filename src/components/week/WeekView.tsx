'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { SaveStatus } from '@/components/day/SaveStatus';
import { Toast } from '@/components/ui/Toast';
import { useWeekAutosave } from '@/hooks/useWeekAutosave';
import type { WeekData, WeekDaySummary } from '@/types/week';
import { PeriodIntentionCard } from '@/components/period/PeriodIntentionCard';
import { PeriodProjectsCard } from '@/components/period/PeriodProjectsCard';
import { PeriodReflectionCard } from '@/components/period/PeriodReflectionCard';
import { WeekDayRow } from './WeekDayRow';
import { WeekTitleCard } from './WeekTitleCard';
import { WeightCard } from './WeightCard';

interface WeekViewProps {
  initial: WeekData;
  days: WeekDaySummary[];
  previousWeightGrams: number | null;
  defaultTitle: string;
  /** Cartão do céu (server component) inserido na grelha. */
  sky: ReactNode;
  /** Nota do Glow (plano e reflexão da semana). */
  glowNote?: ReactNode;
}

/** Cartões interactivos da semana com gravação automática. */
export function WeekView({ initial, days, previousWeightGrams, defaultTitle, sky, glowNote }: WeekViewProps) {
  const t = useTranslations();
  const { data, setText, setWeight, setDayNote, setProject, status, errorKey, flush } = useWeekAutosave(initial);
  const onBlur = () => void flush();

  return (
    <div className="mg-week">
      <SaveStatus status={status} />
      {glowNote}
      <div className="mg-week__grid">
        <div className="mg-week__cell mg-week__cell--title">
          <WeekTitleCard
            value={data.title}
            defaultTitle={defaultTitle}
            onChange={(v) => setText('title', v)}
            onBlur={onBlur}
          />
        </div>
        <div className="mg-week__cell mg-week__cell--intention">
          <PeriodIntentionCard
            id="week-intention"
            label={t('week.intention.label')}
            placeholder={t('week.intention.placeholder')}
            value={data.intention}
            onChange={(v) => setText('intention', v)}
            onBlur={onBlur}
          />
        </div>
        <div className="mg-week__cell mg-week__cell--sky">{sky}</div>
        <section className="mg-week__cell mg-week__cell--days mg-week__days" aria-label={t('week.days.label')}>
          {days.map((day, i) => (
            <WeekDayRow
              key={day.date}
              index={i}
              day={day}
              text={data.dayNotes[day.date] ?? ''}
              onChange={(v) => setDayNote(day.date, v)}
              onBlur={onBlur}
            />
          ))}
        </section>
        <div className="mg-week__cell mg-week__cell--weight">
          <WeightCard grams={data.weightGrams} previousGrams={previousWeightGrams} onCommit={setWeight} />
        </div>
        <div className="mg-week__cell mg-week__cell--projects">
          <PeriodProjectsCard title={t('projects.title')} values={data.projects} onChange={setProject} onBlur={onBlur} />
        </div>
        <div className="mg-week__cell mg-week__cell--reflection">
          <PeriodReflectionCard
            id="week-reflection"
            label={t('week.reflection.title')}
            placeholder={t('week.reflection.placeholder')}
            value={data.reflection}
            onChange={(v) => setText('reflection', v)}
            onBlur={onBlur}
          />
        </div>
      </div>
      {status === 'error' && errorKey && (
        <Toast variant="error" message={t(errorKey)} closeLabel={t('common.close')} duration={0} />
      )}
    </div>
  );
}
