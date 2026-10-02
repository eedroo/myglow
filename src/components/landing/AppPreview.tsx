import { Check, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MoonPhase } from '@prisma/client';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { MOON_PHASE_ORDER, MoonPhaseStrip } from '@/components/ui/MoonPhaseStrip';
import type { MagicIconName } from '@/lib/icons';

/**
 * Pré-visualização da app numa moldura de telemóvel em CSS: markup estático com as classes reais dos componentes
 * e dados de exemplo. Sem DB, sem hooks, não interactivo (`aria-hidden`; a legenda descreve-a).
 */
export function AppPreview({ variant }: { variant: 'today' | 'week' | 'grimoire' }) {
  const t = useTranslations('landing.preview');
  return (
    <figure className="mg-preview">
      <div className="mg-preview__frame">
        <div className="mg-preview__screen" aria-hidden="true">
          {variant === 'today' && <TodayScreen />}
          {variant === 'week' && <WeekScreen />}
          {variant === 'grimoire' && <GrimoireScreen />}
        </div>
      </div>
      <figcaption className="mg-preview__label">{t(`${variant}.caption`)}</figcaption>
    </figure>
  );
}

function Tile({ icon, label, done }: { icon: MagicIconName; label: string; done: boolean }) {
  return (
    <div className={done ? 'mg-check-tile mg-check-tile--checked' : 'mg-check-tile'}>
      <span className="mg-check-tile__icon">
        <MagicIcon name={icon} size="md" decorative />
      </span>
      <div className="mg-check-tile__body">
        <span className="mg-check-tile__label">{label}</span>
      </div>
      <span className="mg-check-tile__check">
        <Check size={18} strokeWidth={2} aria-hidden="true" />
      </span>
    </div>
  );
}

function TodayScreen() {
  const t = useTranslations('landing.preview.today');
  const ta = useTranslations('astro.phases');
  const labels = Object.fromEntries(MOON_PHASE_ORDER.map((p) => [p, ta(p)])) as Record<MoonPhase, string>;
  return (
    <div className="mg-stack">
      <MoonPhaseStrip phase="FIRST_QUARTER" labels={labels} label={t('moon')} />
      <section className="mg-card mg-intention">
        <div className="mg-card__body">
          <p className="mg-intention__head">
            <MagicIcon name="sparkles" size="sm" decorative />
            <span className="mg-intention__label">{t('intentionLabel')}</span>
          </p>
          <p className="mg-lined mg-preview__text">{t('intention')}</p>
        </div>
      </section>
      <section className="mg-period mg-period--morning">
        <Tile icon="tea-cup" label={t('banish')} done />
        <Tile icon="lotus" label={t('ritual')} done />
        <Tile icon="bed" label={t('sleep')} done={false} />
      </section>
      <div className="mg-mood">
        <p className="mg-mood__legend">{t('mood')}</p>
        <div className="mg-mood__faces">
          {[1, 2, 3, 4, 5].map((v) => (
            <span key={v} className={v === 4 ? 'mg-mood__face mg-mood__face--selected' : 'mg-mood__face'}>
              <MagicIcon name={`mood-${v}` as MagicIconName} size="md" decorative />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekScreen() {
  const t = useTranslations('landing.preview.week');
  const days: { icon: MagicIconName; day: string; text: string; dots: number }[] = [
    { icon: 'sun', day: t('d0'), text: t('t0'), dots: 3 },
    { icon: 'moon-crescent', day: t('d1'), text: t('t1'), dots: 3 },
    { icon: 'planet-mars', day: t('d2'), text: t('t2'), dots: 2 },
    { icon: 'planet-mercury', day: t('d3'), text: t('t3'), dots: 1 },
  ];
  return (
    <div className="mg-stack">
      <p className="mg-preview__heading">{t('title')}</p>
      {days.map((d, i) => (
        <div key={i} className="mg-week-day">
          <span className="mg-week-day__icon">
            <MagicIcon name={d.icon} size="sm" decorative />
          </span>
          <span className="mg-week-day__head">
            <span className="mg-week-day__label">{d.day}</span>
            <span className="mg-week-day__date">{4 + i}</span>
          </span>
          <span className="mg-week-day__text mg-preview__text">{d.text}</span>
          <span className="mg-week-day__progress">
            <span className="mg-progress-dots mg-progress-dots--sm">
              {[0, 1, 2].map((k) => (
                <span key={k} className={k < d.dots ? 'mg-progress-dots__dot mg-progress-dots__dot--done' : 'mg-progress-dots__dot'} />
              ))}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function GrimoireScreen() {
  const t = useTranslations('landing.preview.grimoire');
  const nodes: { state: 'completed' | 'current' | 'locked'; icon: MagicIconName }[] = [
    { state: 'completed', icon: 'sparkles' },
    { state: 'completed', icon: 'feather' },
    { state: 'current', icon: 'candle' },
    { state: 'locked', icon: 'crystal-ball' },
  ];
  return (
    <div className="mg-region mg-preview__region">
      <div className="mg-region__header">
        <span className="mg-region__icon">
          <MagicIcon name="grimoire" size="md" decorative />
        </span>
        <span>
          <span className="mg-region__title">{t('course')}</span>
          <span className="mg-region__subtitle">{t('progress')}</span>
        </span>
      </div>
      <div className="mg-preview__nodes">
        {nodes.map((n, i) => (
          <span key={i} className={`mg-preview__node mg-preview__node--${i % 2 ? 'right' : 'left'}`}>
            <span className={`mg-node mg-node--${n.state}`}>
              <span className="mg-node__ring">
                {n.state === 'completed' ? (
                  <Check size={26} strokeWidth={2.5} />
                ) : n.state === 'locked' ? (
                  <Lock size={20} strokeWidth={1.75} />
                ) : (
                  <MagicIcon name={n.icon} size={n.state === 'current' ? 'lg' : 'md'} decorative />
                )}
              </span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
