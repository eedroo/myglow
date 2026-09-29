'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { SaveStatus } from '@/components/day/SaveStatus';
import { PeriodIntentionCard } from '@/components/period/PeriodIntentionCard';
import { PeriodProjectsCard } from '@/components/period/PeriodProjectsCard';
import { PeriodReflectionCard } from '@/components/period/PeriodReflectionCard';
import { Toast } from '@/components/ui/Toast';
import { useYearAutosave } from '@/hooks/useYearAutosave';
import type { YearPlanData } from '@/types/planner';
import { YearWordCard } from './YearWordCard';

interface YearPlanViewProps {
  initial: YearPlanData;
  slots: {
    nav: ReactNode;
    grid: ReactNode;
    wheel: ReactNode;
    retrogrades: ReactNode;
    mood: ReactNode;
    stats: ReactNode;
    glowNote?: ReactNode;
  };
}

/** Planner anual: palavra, intenção, metas e reflexão com gravação automática; o resto como slots. */
export function YearPlanView({ initial, slots }: YearPlanViewProps) {
  const t = useTranslations();
  const { data, setText, setProject, status, errorKey, flush } = useYearAutosave(initial);
  const onBlur = () => void flush();

  return (
    <div className="mg-year">
      <SaveStatus status={status} />
      {slots.nav}
      {slots.glowNote}
      <YearWordCard value={data.word} onChange={(v) => setText('word', v)} onBlur={onBlur} />
      <div className="mg-year__pair">
        <div className="mg-year__cell">
          <PeriodIntentionCard
            id="year-intention"
            label={t('year.intention.label')}
            placeholder={t('year.intention.placeholder')}
            value={data.intention}
            onChange={(v) => setText('intention', v)}
            onBlur={onBlur}
            maxLength={2000}
          />
        </div>
        <div className="mg-year__cell">
          <PeriodProjectsCard
            title={t('year.projects')}
            values={data.projects}
            onChange={setProject}
            onBlur={onBlur}
            compact
            idPrefix="year-project"
          />
        </div>
      </div>
      {slots.grid}
      {slots.wheel}
      {slots.retrogrades}
      {slots.mood}
      {slots.stats}
      <PeriodReflectionCard
        id="year-reflection"
        label={t('year.reflection.label')}
        hint={t('year.reflection.hint')}
        placeholder={t('year.reflection.placeholder')}
        value={data.reflection}
        onChange={(v) => setText('reflection', v)}
        onBlur={onBlur}
        rows={6}
        maxLength={10000}
      />
      {status === 'error' && errorKey && (
        <Toast variant="error" message={t(errorKey)} closeLabel={t('common.close')} duration={0} />
      )}
    </div>
  );
}
