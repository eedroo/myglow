import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getJourney } from '@/lib/journey/server';
import { STAGES } from '@/lib/journey/stages';

/** F19: fundo do Hoje, antes do `Motto`: etapa actual, 5 pontos e o próximo passo. Some na 5 ou com tudo aberto. */
export async function JourneyCard({ userId }: { userId: string }) {
  const journey = await getJourney(userId);
  const { state, progress } = journey;
  if (state.allUnlocked || state.stage === 5) return null;
  const t = await getTranslations('journey');
  return (
    <Link href="/journey" className="mg-journey-card" data-tour="journey-card">
      <span className="mg-journey-card__head">
        <span className="mg-journey-card__title">{t('card.title')}</span>
        <span className="mg-journey-card__stage">{t('card.stage', { n: state.stage, total: STAGES.length })}</span>
      </span>
      <span className="mg-journey-card__dots" aria-hidden="true">
        {STAGES.map((s) => (
          <span
            key={s.stage}
            className={
              s.stage < state.stage
                ? 'mg-journey-card__dot mg-journey-card__dot--done'
                : s.stage === state.stage
                  ? 'mg-journey-card__dot mg-journey-card__dot--current'
                  : 'mg-journey-card__dot'
            }
          />
        ))}
      </span>
      {progress && (
        <span className="mg-journey-card__next">
          {t('card.next', {
            name: t(`stages.${progress.stage}.next`),
            done: progress.done,
            of: progress.of,
            what: t(`stages.${state.stage}.practice`),
          })}
          <ChevronRight size={16} aria-hidden="true" />
        </span>
      )}
    </Link>
  );
}
