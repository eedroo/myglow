'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { SaveStatus } from '@/components/day/SaveStatus';
import { Toast } from '@/components/ui/Toast';
import { useWeekAutosave } from '@/hooks/useWeekAutosave';
import type { WeekData, WeekDaySummary } from '@/types/week';
import { ProjectIntentionsGrid } from './ProjectIntentionsGrid';
import { WeekDayRow } from './WeekDayRow';
import { WeekIntentionCard } from './WeekIntentionCard';
import { WeekReflectionCard } from './WeekReflectionCard';
import { WeekTitleCard } from './WeekTitleCard';
import { WeightCard } from './WeightCard';

interface WeekViewProps {
  initial: WeekData;
  days: WeekDaySummary[];
  previousWeightGrams: number | null;
  defaultTitle: string;
  /** Cartão do céu (server component) inserido na grelha. */
  sky: ReactNode;
}

/** Cartões interactivos da semana com gravação automática. */
export function WeekView({ initial, days, previousWeightGrams, defaultTitle, sky }: WeekViewProps) {
  const t = useTranslations();
  const { data, setText, setWeight, setDayNote, setProject, status, errorKey, flush } = useWeekAutosave(initial);
  const onBlur = () => void flush();

  return (
    <div className="mg-week">
      <SaveStatus status={status} />
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
          <WeekIntentionCard value={data.intention} onChange={(v) => setText('intention', v)} onBlur={onBlur} />
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
          <ProjectIntentionsGrid projects={data.projects} onChange={setProject} onBlur={onBlur} />
        </div>
        <div className="mg-week__cell mg-week__cell--reflection">
          <WeekReflectionCard value={data.reflection} onChange={(v) => setText('reflection', v)} onBlur={onBlur} />
        </div>
      </div>
      {status === 'error' && errorKey && (
        <Toast variant="error" message={t(errorKey)} closeLabel={t('common.close')} duration={0} />
      )}
    </div>
  );
}
