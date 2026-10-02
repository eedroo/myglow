import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';
import { AppPreview } from './AppPreview';

const STEPS: { key: 'morning' | 'body' | 'night'; icon: MagicIconName }[] = [
  { key: 'morning', icon: 'sun' },
  { key: 'body', icon: 'stretch' },
  { key: 'night', icon: 'moon-crescent' },
];

export function DayRhythm() {
  const t = useTranslations('landing.day');
  return (
    <section className="mg-landing__section mg-landing__section--split" aria-labelledby="landing-day-title">
      <div className="mg-landing__inner">
        <div>
          <p className="mg-landing__eyebrow">{t('eyebrow')}</p>
          <h2 id="landing-day-title" className="mg-landing__title">
            {t('title')}
          </h2>
          <ol className="mg-landing__steps">
            {STEPS.map((s) => (
              <li key={s.key} className="mg-landing__step">
                <MagicIcon name={s.icon} size="md" decorative />
                <span>
                  <strong>{t(`${s.key}.title`)}</strong> {t(`${s.key}.text`)}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <AppPreview variant="week" />
      </div>
    </section>
  );
}
