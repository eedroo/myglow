import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { intlLocale, isAppLocale } from '@/i18n/locales';
import type { BadgeView } from '@/lib/grimoire/queries';

/** Emblemas dos cursos do Grimório: conquistados a dourado com data; os outros em silhueta com o nome do curso. */
export async function BadgesCard({ badges }: { badges: BadgeView[] }) {
  const t = await getTranslations('grimoire.badges');
  const rawLocale = await getLocale();
  const fmt = new Intl.DateTimeFormat(intlLocale(isAppLocale(rawLocale) ? rawLocale : 'pt-PT'), { dateStyle: 'medium' });

  return (
    <GlassCard className="mg-badges" title={t('title')}>
      {badges.length === 0 ? (
        <p className="mg-badges__empty">{t('empty')}</p>
      ) : (
        <ul className="mg-badges__grid">
          {badges.map((b) => (
            <li key={b.courseSlug} className={b.earnedAt ? 'mg-badges__slot mg-badges__slot--earned' : 'mg-badges__slot'}>
              <span className="mg-badges__icon">
                <MagicIcon name={b.icon} size="lg" decorative />
              </span>
              <span className="mg-badges__name">{b.earnedAt ? b.name : b.courseTitle}</span>
              {b.earnedAt && <span className="mg-badges__date">{t('earned', { date: fmt.format(new Date(b.earnedAt)) })}</span>}
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
