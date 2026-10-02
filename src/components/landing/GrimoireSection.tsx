import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';
import { AppPreview } from './AppPreview';

const ITEMS: { key: 'map' | 'daily' | 'badges'; icon: MagicIconName }[] = [
  { key: 'map', icon: 'grimoire' },
  { key: 'daily', icon: 'moon-crescent' },
  { key: 'badges', icon: 'crystal-cluster' },
];

export function GrimoireSection() {
  const t = useTranslations('landing.grimoire');
  return (
    <section className="mg-landing__section mg-landing__section--split mg-landing__section--reverse" aria-labelledby="landing-grimoire-title">
      <div className="mg-landing__inner">
        <div>
          <p className="mg-landing__eyebrow">{t('eyebrow')}</p>
          <h2 id="landing-grimoire-title" className="mg-landing__title">
            {t('title')}
          </h2>
          <ul className="mg-landing__list">
            {ITEMS.map((i) => (
              <li key={i.key}>
                <MagicIcon name={i.icon} size="md" decorative />
                <span>{t(i.key)}</span>
              </li>
            ))}
          </ul>
        </div>
        <AppPreview variant="grimoire" />
      </div>
    </section>
  );
}
