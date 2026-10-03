import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { AiRequest, AiState } from '@/lib/ai/queries';
import type { DayPersonalView } from '@/lib/ai/schemas';
import { ASPECT_SYMBOLS, parseAspectLabel } from '@/lib/ai/labels';
import { ReadingPending } from './ReadingPending';

interface DailyReadingCardProps {
  personal: AiState<DayPersonalView>;
  pending: AiRequest[];
}

/**
 * Leitura pessoal do dia (trânsitos ao mapa natal), com palavras-chave e cristal. O horóscopo do signo saiu do dia
 * (fica só no mês). Nada a mostrar (passado sem conteúdo, sem mapa) → não aparece.
 */
export async function DailyReadingCard({ personal, pending }: DailyReadingCardProps) {
  const t = await getTranslations('reading');
  const ta = await getTranslations('astro');
  const p = personal.status === 'ready' ? personal.data : null;
  const waiting = personal.status === 'pending';
  if (!p && !waiting) return null;

  // "Saturno em tensão com o teu Ascendente": frase simples; o nome técnico fica só no detalhe.
  const transitName = (key: string) => ta(`bodies.${key}` as 'bodies.SUN');
  const natalName = (key: string) => t(`natalOf.${key}` as 'natalOf.SUN');
  const classes = ['mg-reading', !p && 'mg-reading--pending'].filter(Boolean).join(' ');

  return (
    <GlassCard className={classes} aria-labelledby={p ? 'reading-personal' : undefined}>
      {p && (
        <section className="mg-reading__section mg-reading__personal" aria-labelledby="reading-personal">
          <h2 id="reading-personal" className="mg-reading__heading">
            <MagicIcon name="sparkles" size="sm" decorative />
            {t('day.personalTitle')}
          </h2>
          <p className="mg-reading__headline">{p.headline}</p>
          <p className="mg-reading__text">{p.reading}</p>
          {p.keywords && (
            <>
              <p className="mg-reading__label">{t('day.keywords')}</p>
              <ul className="mg-reading__keywords">
                {p.keywords.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </>
          )}
          {p.crystal && (
            <div className="mg-reading__crystal">
              <MagicIcon name="crystal-cluster" size="sm" decorative />
              <div>
                <p className="mg-reading__label">{t('day.crystal')}</p>
                <p className="mg-reading__crystal-name">{p.crystal.name}</p>
                <p className="mg-reading__crystal-why">{p.crystal.why}</p>
              </div>
            </div>
          )}
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
                              <span className="mg-reading__symbol" aria-hidden="true">
                                {ASPECT_SYMBOLS[a.type]}
                              </span>
                              <span>
                                {t(`aspectPhrase.${a.type}` as 'aspectPhrase.SQUARE', {
                                  transit: transitName(a.transit),
                                  natal: natalName(a.natal),
                                })}
                              </span>
                            </>
                          ) : (
                            tr.label
                          )}
                        </summary>
                        <p className="mg-reading__meaning">{tr.meaning}</p>
                        {a && (
                          <p className="mg-reading__aspect-name">
                            {t('aspectTechnical', { aspect: t(`aspects.${a.type}` as 'aspects.SQUARE') })}
                          </p>
                        )}
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
      {p && <p className="mg-reading__disclaimer">{t('disclaimer')}</p>}
    </GlassCard>
  );
}
