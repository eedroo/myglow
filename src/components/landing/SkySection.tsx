import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';

const ITEMS: { key: 'moon' | 'chart' | 'readings' | 'rituals'; icon: MagicIconName }[] = [
  { key: 'moon', icon: 'moon-stars' },
  { key: 'chart', icon: 'zodiac-wheel' },
  { key: 'readings', icon: 'crystal-ball' },
  { key: 'rituals', icon: 'candle' },
];

export function SkySection() {
  const t = useTranslations('landing.sky');
  return (
    <section className="mg-landing__section" aria-labelledby="landing-sky-title">
      <div className="mg-landing__inner">
        <p className="mg-landing__eyebrow">{t('eyebrow')}</p>
        <h2 id="landing-sky-title" className="mg-landing__title">
          {t('title')}
        </h2>
        <ul className="mg-landing__list">
          {ITEMS.map((i) => (
            <li key={i.key}>
              <MagicIcon name={i.icon} size="md" decorative />
              <span>
                <strong>{t(`${i.key}.title`)}</strong> {t(`${i.key}.text`)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mg-landing__note">{t('note')}</p>
      </div>
    </section>
  );
}
