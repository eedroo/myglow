import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { formatTimeInTz } from '@/lib/dates';
import type { DailySky, NatalChart, ZodiacPosition } from '@/types/astro';

interface DailySkyCardProps {
  sky: DailySky;
  natal: NatalChart | null;
  isToday: boolean;
}

/** O céu do dia (Sol, Lua, ingresso/evento) e o mapa natal resumido do utilizador. O horóscopo segue no `DailyReadingCard`. */
export async function DailySkyCard({ sky, natal, isToday }: DailySkyCardProps) {
  const t = await getTranslations('day.sky');
  const ta = await getTranslations('astro');

  const position = (p: ZodiacPosition) =>
    t('position', { sign: ta(`signs.${p.sign}`), degree: Math.floor(p.degree) });
  const time = (iso: string) => formatTimeInTz(iso, sky.timezone);
  const { moon } = sky;

  return (
    <GlassCard variant="accent" className="mg-sky-card">
      <section className="mg-sky-card__section" aria-labelledby="sky-title">
        <h2 id="sky-title" className="mg-sky-card__heading">
          <MagicIcon name="moon-stars" size="sm" decorative />
          {isToday ? t('title') : t('titlePast')}
        </h2>
        <p className="mg-sky-card__row">
          <span className="mg-sky-card__label">{t('sun')}</span>
          <span className="mg-sky-card__value">{position(sky.sun)}</span>
        </p>
        <p className="mg-sky-card__row">
          <span className="mg-sky-card__label">{t('moon')}</span>
          <span className="mg-sky-card__value">
            {t('moonValue', {
              sign: ta(`signs.${moon.signAtNoon}`),
              phase: ta(`phases.${moon.phase}`),
              illumination: Math.round(moon.illumination * 100),
            })}
          </span>
        </p>
        {moon.event && (
          <p className="mg-sky-card__note">
            {t('event', { phase: ta(`phases.${moon.event.phase}`), time: time(moon.event.at) })}
          </p>
        )}
        {moon.ingress && (
          <p className="mg-sky-card__note">
            {t('ingress', { sign: ta(`signs.${moon.ingress.sign}`), time: time(moon.ingress.at) })}
          </p>
        )}
      </section>

      <section className="mg-sky-card__section mg-sky-card__you" aria-labelledby="sky-you">
        <h2 id="sky-you" className="mg-sky-card__heading">
          <MagicIcon name="zodiac-wheel" size="sm" decorative />
          {t('you')}
        </h2>
        {natal ? (
          <>
            <p className="mg-sky-card__row">
              <span className="mg-sky-card__label">{t('sun')}</span>
              <span className="mg-sky-card__value">{position(natal.bodies.SUN)}</span>
            </p>
            <p className="mg-sky-card__row">
              <span className="mg-sky-card__label">{t('moon')}</span>
              <span className="mg-sky-card__value">
                {natal.moonSignUncertain
                  ? t('moonUncertain', { sign: ta(`signs.${natal.bodies.MOON.sign}`) })
                  : position(natal.bodies.MOON)}
              </span>
            </p>
            <p className="mg-sky-card__row">
              <span className="mg-sky-card__label">{t('ascendant')}</span>
              {natal.ascendant ? (
                <span className="mg-sky-card__value">{position(natal.ascendant)}</span>
              ) : (
                <Link href="/onboarding?edit=1" className="mg-sky-card__note">
                  {t('addBirthTime')}
                </Link>
              )}
            </p>
          </>
        ) : (
          <Link href="/onboarding?edit=1" className="mg-sky-card__note">
            {t('noBirthData')}
          </Link>
        )}
      </section>
    </GlassCard>
  );
}
