import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';
import { LEVELS } from '@/lib/xp/levels';

export function GlowSection() {
  const t = useTranslations();
  return (
    <section className="mg-landing__section" aria-labelledby="landing-glow-title">
      <div className="mg-landing__inner">
        <p className="mg-landing__eyebrow">{t('landing.glow.eyebrow')}</p>
        <h2 id="landing-glow-title" className="mg-landing__title">
          {t('landing.glow.title')}
        </h2>
        <p className="mg-landing__lead">{t('landing.glow.text')}</p>
        <ol className="mg-landing__levels">
          {LEVELS.map((l) => (
            <li key={l.key} className="mg-landing__level">
              <MagicIcon name={`level-${l.level}` as MagicIconName} size="lg" decorative />
              <span>{t(`glow.levels.${l.key}.name`)}</span>
            </li>
          ))}
        </ol>
        <p className="mg-landing__note">{t('landing.glow.note')}</p>
      </div>
    </section>
  );
}
