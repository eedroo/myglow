import type { ProjectArea } from '@prisma/client';
import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { PROJECT_ICONS } from '@/lib/icons';
import type { AiRequest } from '@/lib/ai/queries';
import { ReadingPending } from './ReadingPending';

export interface PeriodReadingSign {
  headline: string;
  overview: string;
  dates: { date: string; label: string; note: string }[];
}

export interface PeriodReadingPersonal {
  headline: string;
  reading: string;
  focusAreas: { area: ProjectArea; note: string }[];
}

interface PeriodReadingCardProps {
  id: string;
  title: string;
  signTitle: string;
  personalTitle: string;
  datesTitle: string;
  sign: PeriodReadingSign | null;
  personal: PeriodReadingPersonal | null;
  pending: AiRequest[];
  /** Há partes em preparação (mostra `ReadingPending`). */
  waiting: boolean;
}

/** Estrutura comum de `WeekReadingCard` e `MonthReadingCard` (energia do signo + leitura pessoal). */
export async function PeriodReadingCard({
  id, title, signTitle, personalTitle, datesTitle, sign, personal, pending, waiting,
}: PeriodReadingCardProps) {
  const t = await getTranslations('reading');
  const tp = await getTranslations('projects');
  if (!sign && !personal && !waiting) return null;
  const classes = ['mg-reading', sign && personal && 'mg-reading--split', !sign && !personal && 'mg-reading--pending']
    .filter(Boolean)
    .join(' ');

  return (
    <GlassCard className={classes} title={title}>
      {sign && (
        <section className="mg-reading__section mg-reading__sign" aria-labelledby={`${id}-sign`}>
          <h3 id={`${id}-sign`} className="mg-reading__heading">
            <MagicIcon name="zodiac-wheel" size="sm" decorative />
            {signTitle}
          </h3>
          <p className="mg-reading__headline">{sign.headline}</p>
          <p className="mg-reading__text">{sign.overview}</p>
          {sign.dates.length > 0 && (
            <>
              <p className="mg-reading__label">{datesTitle}</p>
              <ul className="mg-reading__highlights">
                {sign.dates.map((d) => (
                  <li key={`${d.date}-${d.note}`}>
                    <time className="mg-reading__date" dateTime={d.date}>
                      {d.label}
                    </time>
                    <span>{d.note}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {personal && (
        <section className="mg-reading__section mg-reading__personal" aria-labelledby={`${id}-personal`}>
          <h3 id={`${id}-personal`} className="mg-reading__heading">
            <MagicIcon name="sparkles" size="sm" decorative />
            {personalTitle}
          </h3>
          <p className="mg-reading__headline">{personal.headline}</p>
          <p className="mg-reading__text">{personal.reading}</p>
          {personal.focusAreas.length > 0 && (
            <>
              <p className="mg-reading__label">{t('focus')}</p>
              <ul className="mg-reading__focus">
                {personal.focusAreas.map((f) => (
                  <li key={f.area}>
                    <MagicIcon name={PROJECT_ICONS[f.area]} size="sm" decorative />
                    <span>
                      <strong>{tp(`areas.${f.area}`)}</strong> · {f.note}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {waiting && <ReadingPending requests={pending} />}
      {(sign || personal) && <p className="mg-reading__disclaimer">{t('disclaimer')}</p>}
    </GlassCard>
  );
}
