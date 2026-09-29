import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { AiRequest, AiState } from '@/lib/ai/queries';
import type { DayHoroscope, DayPersonal } from '@/lib/ai/schemas';
import { ASPECT_SYMBOLS, parseAspectLabel } from '@/lib/ai/labels';
import { ReadingPending } from './ReadingPending';

interface DailyReadingCardProps {
  horoscope: AiState<DayHoroscope>;
  personal: AiState<DayPersonal>;
  pending: AiRequest[];
  /** Nome do signo solar natal (já traduzido). */
  signLabel: string | null;
}

/** Horóscopo do signo + leitura pessoal do dia. Nada a mostrar (passado sem conteúdo, sem mapa) → não aparece. */
export async function DailyReadingCard({ horoscope, personal, pending, signLabel }: DailyReadingCardProps) {
  const t = await getTranslations('reading');
  const ta = await getTranslations('astro');
  const h = horoscope.status === 'ready' ? horoscope.data : null;
  const p = personal.status === 'ready' ? personal.data : null;
  const waiting = horoscope.status === 'pending' || personal.status === 'pending';
  if (!h && !p && !waiting) return null;

  const point = (key: string) => (key === 'ASC' ? t('ascendant') : ta(`bodies.${key}`));
  const classes = ['mg-reading', h && p && 'mg-reading--split', !h && !p && 'mg-reading--pending'].filter(Boolean).join(' ');

  return (
    <GlassCard className={classes} aria-labelledby={h ? 'reading-sign' : p ? 'reading-personal' : undefined}>
      {h && (
        <section className="mg-reading__section mg-reading__sign" aria-labelledby="reading-sign">
          <h2 id="reading-sign" className="mg-reading__heading">
            <MagicIcon name="zodiac-wheel" size="sm" decorative />
            {t('day.signTitle', { sign: signLabel ?? '' })}
          </h2>
          <p className="mg-reading__headline">{h.headline}</p>
          <p className="mg-reading__text">{h.energy}</p>
          <p className="mg-reading__advice">{h.advice}</p>
          <p className="mg-reading__label">{t('day.keywords')}</p>
          <ul className="mg-reading__keywords">
            {h.keywords.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
          <div className="mg-reading__crystal">
            <MagicIcon name="crystal-cluster" size="sm" decorative />
            <div>
              <p className="mg-reading__label">{t('day.crystal')}</p>
              <p className="mg-reading__crystal-name">{h.crystal.name}</p>
              <p className="mg-reading__crystal-why">{h.crystal.why}</p>
            </div>
          </div>
        </section>
      )}

      {p && (
        <section className="mg-reading__section mg-reading__personal" aria-labelledby="reading-personal">
          <h2 id="reading-personal" className="mg-reading__heading">
            <MagicIcon name="sparkles" size="sm" decorative />
            {t('day.personalTitle')}
          </h2>
          <p className="mg-reading__headline">{p.headline}</p>
          <p className="mg-reading__text">{p.reading}</p>
          {p.transits.length > 0 && (
            <>
              <p className="mg-reading__label">{t('day.transits')}</p>
              <ul className="mg-reading__transits">
                {p.transits.map((tr) => {
                  const a = parseAspectLabel(tr.label);
                  return (
                    <li key={tr.label}>
                      <details className="mg-reading__chip">
                        <summary>
                          {a ? (
                            <>
                              {point(a.transit)}{' '}
                              <span className="mg-reading__symbol" aria-hidden="true">
                                {ASPECT_SYMBOLS[a.type]}
                              </span>
                              <span className="mg-visually-hidden">{t(`aspects.${a.type}`)}</span>{' '}
                              {t('natalPoint', { point: point(a.natal) })}
                            </>
                          ) : (
                            tr.label
                          )}
                        </summary>
                        <p className="mg-reading__meaning">{tr.meaning}</p>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}

      {waiting && <ReadingPending requests={pending} />}
      {(h || p) && <p className="mg-reading__disclaimer">{t('disclaimer')}</p>}
    </GlassCard>
  );
}
