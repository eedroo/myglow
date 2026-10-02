'use client';

import { useTranslations } from 'next-intl';
import { Toast } from '@/components/ui/Toast';
import { useDailyAutosave } from '@/hooks/useDailyAutosave';
import type { DailyEntryData, DayPeriod } from '@/types/daily';
import { BodyFocusBar } from './BodyFocusBar';
import { DaySummaryCard } from './DaySummaryCard';
import { GratitudeMoodCard } from './GratitudeMoodCard';
import { IntentionCard } from './IntentionCard';
import { MorningSection } from './MorningSection';
import { NightSection } from './NightSection';
import { ReflectionCard } from './ReflectionCard';
import { SaveStatus } from './SaveStatus';
import { WakeMoodCard } from './WakeMoodCard';
import { WellbeingNotice } from '@/components/account/WellbeingNotice';

interface DayViewProps {
  date: string;
  initial: DailyEntryData;
  sleepGoalMinutes: number;
  /** Período actual (só em "hoje"); null em dias passados. */
  currentPeriod: DayPeriod | null;
  /** Sugestões da leitura IA do dia (F6). */
  suggestions?: { intention?: string; banish?: string; reflection?: string };
  /** F9: consentimento de bem-estar; sem ele humor, "como acordei" e sono ficam desactivados. */
  wellbeing: boolean;
}

/** Cartões interactivos do diário com gravação automática. */
export function DayView({ date, initial, sleepGoalMinutes, currentPeriod, suggestions, wellbeing }: DayViewProps) {
  const t = useTranslations();
  const { data, setField, status, errorKey, flush } = useDailyAutosave(date, initial);
  const onBlur = () => void flush();

  return (
    <div className="mg-day">
      <SaveStatus status={status} />
      <div className="mg-day__grid">
        <div className="mg-day__cell mg-day__cell--intention">
          <IntentionCard
            value={data.intention}
            onChange={(v) => setField('intention', v)}
            onBlur={onBlur}
            suggestion={suggestions?.intention}
          />
        </div>
        <div className="mg-day__cell mg-day__cell--morning">
          <MorningSection
            data={data}
            setField={setField}
            onTextBlur={onBlur}
            sleepGoalMinutes={sleepGoalMinutes}
            current={currentPeriod === 'morning'}
            banishSuggestion={suggestions?.banish}
            showSleep={wellbeing}
          />
        </div>
        <div className="mg-day__cell mg-day__cell--wake">
          {wellbeing ? (
            <WakeMoodCard
              mood={data.wakeMood}
              note={data.wakeNote}
              onMoodChange={(v) => setField('wakeMood', v)}
              onNoteChange={(v) => setField('wakeNote', v)}
              onNoteBlur={onBlur}
            />
          ) : (
            <WellbeingNotice />
          )}
        </div>
        <div className="mg-day__cell mg-day__cell--body">
          <BodyFocusBar data={data} setField={setField} current={currentPeriod === 'body'} />
        </div>
        <div className="mg-day__cell mg-day__cell--night">
          <NightSection data={data} setField={setField} onTextBlur={onBlur} current={currentPeriod === 'night'} />
        </div>
        <div className="mg-day__cell mg-day__cell--gratitude">
          <GratitudeMoodCard
            gratitude={data.gratitude}
            mood={data.mood}
            onGratitudeChange={(v) => setField('gratitude', v)}
            onGratitudeBlur={onBlur}
            onMoodChange={(v) => setField('mood', v)}
            showMood={wellbeing}
          />
        </div>
        <div className="mg-day__cell mg-day__cell--reflection">
          <ReflectionCard
            value={data.reflection}
            onChange={(v) => setField('reflection', v)}
            onBlur={onBlur}
            hint={suggestions?.reflection}
          />
        </div>
        <div className="mg-day__cell mg-day__cell--summary">
          <DaySummaryCard value={data.summary} onChange={(v) => setField('summary', v)} onBlur={onBlur} />
        </div>
      </div>
      {status === 'error' && errorKey && (
        <Toast variant="error" message={t(errorKey)} closeLabel={t('common.close')} duration={0} />
      )}
    </div>
  );
}
