import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { formatLongDate } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import type { XpAward } from '@/lib/xp/award';

/** Últimos eventos de Glow do ledger. */
export async function GlowHistoryCard({ items }: { items: XpAward[] }) {
  const [t, rawLocale] = await Promise.all([getTranslations('glow'), getLocale()]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';

  return (
    <GlassCard title={t('journey.historyTitle')}>
      {items.length === 0 ? (
        <p>{t('journey.historyEmpty')}</p>
      ) : (
        <ul className="mg-glow-history">
          {items.map((a) => (
            <li key={`${a.source}-${a.periodStart}`} className="mg-glow-history__item">
              <MagicIcon name={a.source === 'STREAK_BONUS' ? 'flame' : 'glow-orb'} size="sm" decorative />
              <span>
                <span className="mg-glow-history__label">{t(`sources.${a.source}`)}</span>
                <span className="mg-glow-history__date">{formatLongDate(a.periodStart, locale)}</span>
              </span>
              <span className="mg-glow-history__points">{t('points', { points: a.points })}</span>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
