'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { SaveStatus } from '@/components/day/SaveStatus';
import { PeriodIntentionCard } from '@/components/period/PeriodIntentionCard';
import { PeriodProjectsCard } from '@/components/period/PeriodProjectsCard';
import { PeriodReflectionCard } from '@/components/period/PeriodReflectionCard';
import { Toast } from '@/components/ui/Toast';
import { useMonthAutosave } from '@/hooks/useMonthAutosave';
import type { MonthPlanData } from '@/types/planner';

interface MonthPlanViewProps {
  initial: MonthPlanData;
  /** Cartões server inseridos na ordem da página. */
  slots: {
    nav: ReactNode;
    hero: ReactNode;
    calendar: ReactNode;
    sky: ReactNode;
    retrogrades: ReactNode;
    weeks: ReactNode;
    stats: ReactNode; // null em meses futuros
    rituals: ReactNode;
    glowNote?: ReactNode;
  };
}

/** Planner mensal: intenção, metas e reflexão com gravação automática; o resto chega como slots. */
export function MonthPlanView({ initial, slots }: MonthPlanViewProps) {
  const t = useTranslations();
  const { data, setText, setProject, status, errorKey, flush } = useMonthAutosave(initial);
  const onBlur = () => void flush();

  return (
    <div className="mg-month">
      <SaveStatus status={status} />
      {slots.nav}
      {slots.glowNote}
      {slots.hero}
      <div className="mg-month__pair">
        <div className="mg-month__cell">
          <PeriodIntentionCard
            id="month-intention"
            label={t('month.intention.label')}
            placeholder={t('month.intention.placeholder')}
            value={data.intention}
            onChange={(v) => setText('intention', v)}
            onBlur={onBlur}
          />
        </div>
        <div className="mg-month__cell">
          <PeriodProjectsCard
            title={t('month.projects')}
            values={data.projects}
            onChange={setProject}
            onBlur={onBlur}
            compact
            idPrefix="month-project"
          />
        </div>
      </div>
      {slots.calendar}
      <div className="mg-month__pair">
        <div className="mg-month__cell">{slots.sky}</div>
        <div className="mg-month__cell">{slots.retrogrades}</div>
      </div>
      {slots.weeks}
      {slots.stats}
      {slots.rituals}
      <PeriodReflectionCard
        id="month-reflection"
        label={t('month.reflection.label')}
        hint={t('month.reflection.hint')}
        placeholder={t('month.reflection.placeholder')}
        value={data.reflection}
        onChange={(v) => setText('reflection', v)}
        onBlur={onBlur}
        rows={5}
        maxLength={6000}
      />
      {status === 'error' && errorKey && (
        <Toast variant="error" message={t(errorKey)} closeLabel={t('common.close')} duration={0} />
      )}
    </div>
  );
}
