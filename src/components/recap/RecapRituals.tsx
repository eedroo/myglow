'use client';

import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';
import type { RecapSlideProps } from './RecapSlideView';

/** Rituais da manhã e da noite e banimentos (só os que aconteceram). */
export function RecapRituals({ slide }: RecapSlideProps<'rituals'>) {
  const t = useTranslations('recap.rituals');
  const banishes = slide.morningBanish.done + slide.nightBanish.done;
  const rows: { key: string; icon: MagicIconName; value: string }[] = [];
  if (slide.morningRitual.done > 0) rows.push({ key: 'morning', icon: 'sun', value: t('count', { done: slide.morningRitual.done, of: slide.morningRitual.of }) });
  if (slide.nightRitual.done > 0) rows.push({ key: 'night', icon: 'moon-crescent', value: t('count', { done: slide.nightRitual.done, of: slide.nightRitual.of }) });
  if (banishes > 0) rows.push({ key: 'banish', icon: 'candle', value: String(banishes) });
  return (
    <div className="mg-recap-rituals">
      <h2 className="mg-recap-slide__title">{t('title')}</h2>
      <ul className="mg-recap-list">
        {rows.map((r) => (
          <li key={r.key} className="mg-recap-list__item">
            <MagicIcon name={r.icon} size="md" decorative />
            <span className="mg-recap-list__label">{t(r.key)}</span>
            <span className="mg-recap-list__value">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
