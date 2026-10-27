import { Check, Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Journey } from '@/lib/journey/server';
import { STAGES } from '@/lib/journey/stages';
import { ReviewLessonButton } from './UnlockCeremony';
import { UnlockAllDialog } from './UnlockAllDialog';

/** F19: `/journey`: as 5 etapas num caminho vertical, com o progresso da actual e "Rever a mini-lição" nas feitas. */
export async function JourneyPath({ journey }: { journey: Journey }) {
  const t = await getTranslations('journey');
  const { state, progress } = journey;
  // A etapa 5 é o fim: lá chegada, fica concluída.
  const done = (stage: number) => state.allUnlocked || stage < state.stage || (stage === 5 && state.stage === 5);
  return (
    <div className="mg-journey-path">
      <ol className="mg-journey-path__list">
        {STAGES.map((s) => {
          const status = done(s.stage) ? 'done' : s.stage === state.stage ? 'current' : 'next';
          return (
            <li key={s.stage} className={`mg-journey-path__stage mg-journey-path__stage--${status}`} aria-current={status === 'current' ? 'step' : undefined}>
              <span className="mg-journey-path__marker" aria-hidden="true">
                {status === 'done' ? <Check size={16} /> : status === 'next' ? <Lock size={14} /> : s.stage}
              </span>
              <div className="mg-journey-path__body">
                <h2 className="mg-journey-path__name">{t(`stages.${s.stage}.name`)}</h2>
                <p className="mg-journey-path__opens">{t(`stages.${s.stage}.opens`)}</p>
                <p className="mg-journey-path__state">{t(`path.${status}`)}</p>
                {status === 'current' && progress && (
                  <p className="mg-journey-path__progress">
                    {t('path.progress', { done: progress.done, of: progress.of, what: t(`stages.${s.stage}.practice`) })}
                  </p>
                )}
                {status === 'done' && s.unlockId && <ReviewLessonButton unlockId={s.unlockId} label={t('path.review')} />}
              </div>
            </li>
          );
        })}
      </ol>
      {journey.planners.has('month') && (
        <p className="mg-journey-path__extra">
          {t('path.monthYear')}
          {state.extraUnlocks.has('month-year') && <ReviewLessonButton unlockId="month-year" label={t('path.review')} />}
        </p>
      )}
      {!state.allUnlocked && state.stage < 5 && (
        <div className="mg-journey-path__footer">
          <UnlockAllDialog variant="link" />
        </div>
      )}
    </div>
  );
}
