import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';

const PILLARS: { key: 'journal' | 'planner' | 'grimoire'; icon: MagicIconName }[] = [
  { key: 'journal', icon: 'journal' },
  { key: 'planner', icon: 'calendar' },
  { key: 'grimoire', icon: 'grimoire' },
];

export function Pillars() {
  const t = useTranslations('landing.pillars');
  return (
    <section className="mg-landing__section" aria-labelledby="landing-pillars-title">
      <div className="mg-landing__inner">
        <h2 id="landing-pillars-title" className="mg-landing__title">
          {t('title')}
        </h2>
        <ul className="mg-pillars">
          {PILLARS.map((p) => (
            <li key={p.key} className="mg-pillars__card">
              <span className="mg-pillars__icon">
                <MagicIcon name={p.icon} size="lg" decorative />
              </span>
              <h3 className="mg-pillars__title">{t(`${p.key}.title`)}</h3>
              <p className="mg-pillars__text">{t(`${p.key}.text`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
