import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatGramsAsKg } from '@/lib/weight';
import { formatLongDate } from '@/lib/dates';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import type { ExerciseHistoryGroup, ExerciseView } from '@/lib/fitness/types';
import { formatClock } from '@/lib/fitness/session';
import { PrTrophy } from './PrTrophy';
import { SetLine } from './SetLine';

/** "+4:02" (descanso antes desta série). */
const restText = (sec: number | null) => (sec === null ? '' : `+${formatClock(sec).replace(/^00:/, '0:').replace(/^0(\d):/, '$1:')}`);

/** Histórico do exercício por data: as séries em linhas (hora, descanso antes, reps e kg ou tempo), da mais recente para a mais antiga. */
export async function ExerciseHistory({ groups, timezone }: { groups: ExerciseHistoryGroup[]; timezone: string }) {
  const [t, raw] = await Promise.all([getTranslations('fitness.history'), getLocale()]);
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const time = new Intl.DateTimeFormat(intlLocale(locale), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: timezone });
  if (!groups.length) return <p className="mg-body-empty">{t('empty')}</p>;
  return (
    <ul className="mg-ex-history">
      {groups.map((g) => (
        <li key={g.sessionId} className="mg-ex-history__group">
          <h3 className="mg-ex-history__date">{formatLongDate(g.date, locale)}</h3>
          <ol className="mg-ex-history__sets">
            {[...g.sets].reverse().map((s) => (
              <li key={s.id}>
                <SetLine
                  time={time.format(new Date(s.time))}
                  rest={restText(s.restBeforeSec) || null}
                  reps={s.durationSec != null ? null : s.reps}
                  kg={s.durationSec == null && s.weightGrams != null ? formatGramsAsKg(s.weightGrams, intlLocale(locale)) : null}
                  seconds={s.durationSec}
                  end={<PrTrophy kinds={s.prKinds} size={16} />}
                />
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  );
}

/** Imagens e instruções na língua da pessoa. */
export async function ExerciseHowTo({ images, instructions, name }: { images: string[]; instructions: string[]; name: string }) {
  const t = await getTranslations('fitness.exercises');
  if (!images.length && !instructions.length) return null;
  return (
    <GlassCard title={t('howTo')}>
      <div className="mg-ex-howto">
        {images.length > 0 && (
          <div className="mg-ex-howto__images">
            {images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={t('imageAlt', { name, n: i + 1 })} loading="lazy" decoding="async" width={640} height={480} />
            ))}
          </div>
        )}
        {instructions.length > 0 && (
          <ol className="mg-ex-howto__steps">
            {instructions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
      </div>
    </GlassCard>
  );
}

/**
 * Debaixo do nome: uma linha curta (músculo principal · equipamento). O resto (todos os músculos, categoria, medida,
 * nível e as acções, como "Adicionar a um treino") fica em "Detalhes", fechado.
 */
export async function ExerciseDetail({ exercise, level, children }: { exercise: ExerciseView; level: string | null; children?: ReactNode }) {
  const t = await getTranslations('fitness');
  const label = (ns: 'muscles' | 'equipment' | 'categories', k: string) => (t.has(`${ns}.${k}`) ? t(`${ns}.${k}`) : k);
  const summary = [exercise.primaryMuscles[0] && label('muscles', exercise.primaryMuscles[0]), label('equipment', exercise.equipment ?? 'none')].filter(Boolean).join(' · ');
  return (
    <section className="mg-ex-detail">
      <p className="mg-ex-detail__summary">{summary}</p>
      <details className="mg-ex-detail__more">
        <summary>{t('exercises.details')}</summary>
        <div className="mg-ex-detail__meta">
          {exercise.primaryMuscles.map((m) => (
            <span key={m} className="mg-ex-detail__tag">
              {label('muscles', m)}
            </span>
          ))}
          {exercise.secondaryMuscles.map((m) => (
            <span key={m} className="mg-ex-detail__tag">
              {t('exercises.secondary', { muscle: label('muscles', m) })}
            </span>
          ))}
          <span className="mg-ex-detail__tag">{label('equipment', exercise.equipment ?? 'none')}</span>
          <span className="mg-ex-detail__tag">{label('categories', exercise.category)}</span>
          <span className="mg-ex-detail__tag">{t(`measures.${exercise.measure}`)}</span>
          {level && t.has(`levels.${level}`) && <span className="mg-ex-detail__tag">{t(`levels.${level}`)}</span>}
        </div>
        {children}
      </details>
    </section>
  );
}
