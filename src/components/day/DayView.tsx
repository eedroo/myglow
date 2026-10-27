'use client';

import type { ReactNode } from 'react';
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
import type { SectionKey } from '@/lib/guided/sections';

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
  /** O texto do planner da Semana para este dia (`DayPlanNote`), acima da intenção. */
  planNote?: ReactNode;
  /** F18: base das rotas do modo guiado (`/guided/day/{date}`) quando o dia ainda o permite. */
  guidedBase?: string | null;
  /** F19: secções desbloqueadas na jornada; as outras não aparecem (os dados ficam). Sem isto, tudo. */
  unlocked?: SectionKey[];
}

/** Cartões interactivos do diário com gravação automática. */
export function DayView({ date, initial, sleepGoalMinutes, currentPeriod, suggestions, wellbeing, planNote, guidedBase, unlocked }: DayViewProps) {
  const t = useTranslations();
  const { data, setField, status, errorKey, flush } = useDailyAutosave(date, initial);
  const onBlur = () => void flush();
  const has = (k: SectionKey) => !unlocked || unlocked.includes(k);
  const morning = { banish: has('morningBanish'), ritual: has('morningRitual'), sleep: wellbeing && has('sleep') };
  const night = { banish: has('nightBanish'), ritual: has('nightRitual') };

  return (
    <div className="mg-day">
      <SaveStatus status={status} />
      <div className="mg-day__grid">
        <div className="mg-day__cell mg-day__cell--intention">
          {planNote}
          {has('intention') && (
            <IntentionCard
              value={data.intention}
              onChange={(v) => setField('intention', v)}
              onBlur={onBlur}
              suggestion={suggestions?.intention}
            />
          )}
        </div>
        {(morning.banish || morning.ritual || morning.sleep) && (
          <div className="mg-day__cell mg-day__cell--morning">
            <MorningSection
              data={data}
              setField={setField}
              onTextBlur={onBlur}
              sleepGoalMinutes={sleepGoalMinutes}
              current={currentPeriod === 'morning'}
              banishSuggestion={suggestions?.banish}
              showSleep={morning.sleep}
              showBanish={morning.banish}
              showRitual={morning.ritual}
              guidedBase={guidedBase}
            />
          </div>
        )}
        {has('wakeMood') && (
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
        )}
        {has('body') && (
          <div className="mg-day__cell mg-day__cell--body">
            <BodyFocusBar data={data} setField={setField} current={currentPeriod === 'body'} guidedBase={guidedBase} />
          </div>
        )}
        {(night.banish || night.ritual) && (
          <div className="mg-day__cell mg-day__cell--night">
            <NightSection
              data={data}
              setField={setField}
              onTextBlur={onBlur}
              current={currentPeriod === 'night'}
              guidedBase={guidedBase}
              showBanish={night.banish}
              showRitual={night.ritual}
            />
          </div>
        )}
        {has('gratitude') && (
          /* F19: o passo "noite" do guia aponta para a gratidão (a secção da noite só abre na etapa 2). */
          <div className="mg-day__cell mg-day__cell--gratitude" data-tour="night-section">
            <GratitudeMoodCard
              gratitude={data.gratitude}
              mood={data.mood}
              onGratitudeChange={(v) => setField('gratitude', v)}
              onGratitudeBlur={onBlur}
              onMoodChange={(v) => setField('mood', v)}
              showMood={wellbeing && has('mood')}
            />
          </div>
        )}
        {has('reflection') && (
          <div className="mg-day__cell mg-day__cell--reflection">
            <ReflectionCard
              value={data.reflection}
              onChange={(v) => setField('reflection', v)}
              onBlur={onBlur}
              hint={suggestions?.reflection}
            />
          </div>
        )}
        {has('summary') && (
          <div className="mg-day__cell mg-day__cell--summary">
            <DaySummaryCard value={data.summary} onChange={(v) => setField('summary', v)} onBlur={onBlur} />
          </div>
        )}
      </div>
      {status === 'error' && errorKey && (
        <Toast variant="error" message={t(errorKey)} closeLabel={t('common.close')} duration={0} />
      )}
    </div>
  );
}
