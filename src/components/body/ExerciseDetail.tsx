import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatGramsAsKg } from '@/lib/weight';
import { formatLongDate } from '@/lib/dates';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import type { ExerciseHistoryGroup, ExerciseView } from '@/lib/fitness/types';
import { formatClock } from '@/lib/fitness/session';
import { PrTrophy } from './PrTrophy';

/** "+4:02" (descanso antes desta série). */
const restText = (sec: number | null) => (sec === null ? '' : `+${formatClock(sec).replace(/^00:/, '0:').replace(/^0(\d):/, '$1:')}`);

/** Histórico do exercício por data: hora, descanso antes, reps e kg (ou tempo). */
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
          {g.sets.map((s, i) => (
            <div key={s.id} className="mg-ex-history__row">
              <span className="mg-set-row__n">{i + 1}</span>
              <span className="mg-ex-history__time">{time.format(new Date(s.time))}</span>
              <span className="mg-ex-history__rest">{restText(s.restBeforeSec)}</span>
              <span>
                {s.durationSec != null && <span className="mg-metric--time">{t('seconds', { n: s.durationSec })}</span>}
                {s.reps != null && <span className="mg-metric--reps">{t('reps', { n: s.reps })}</span>}
                {s.weightGrams != null && (
                  <>
                    {' · '}
                    <span className="mg-metric--kg">{t('kg', { kg: formatGramsAsKg(s.weightGrams, intlLocale(locale)) })}</span>
                  </>
                )}
              </span>
              <PrTrophy kinds={s.prKinds} size={16} />
            </div>
          ))}
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

/** Cabeçalho do exercício: músculos, equipamento, categoria. */
export async function ExerciseDetail({ exercise, level }: { exercise: ExerciseView; level: string | null }) {
  const t = await getTranslations('fitness');
  const label = (ns: 'muscles' | 'equipment' | 'categories', k: string) => (t.has(`${ns}.${k}`) ? t(`${ns}.${k}`) : k);
  return (
    <section className="mg-ex-detail">
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
    </section>
  );
}
