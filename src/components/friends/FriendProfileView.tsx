import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { ZODIAC_ICON } from '@/components/ui/ZodiacStrip';
import { intlLocale, isAppLocale } from '@/i18n/locales';
import { publishedCourses } from '@/lib/grimoire/queries';
import type { FriendProfile } from '@/lib/friends/queries';
import { FriendAvatar } from './FriendAvatar';

/** O que um amigo vê: nível, sequência, cursos, emblemas e (se partilhados) Sol, Lua e Ascendente. Nada do diário. */
export async function FriendProfileView({ profile }: { profile: FriendProfile }) {
  const [t, tg, tb, ta, rawLocale] = await Promise.all([
    getTranslations('friends.profile'),
    getTranslations('glow'),
    getTranslations('grimoire.badges'),
    getTranslations('astro'),
    getLocale(),
  ]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium' });
  const catalog = new Map(publishedCourses({ userLocale: locale, readInPortuguese: true }).map((c) => [c.entry.slug, c.course]));
  const current = profile.currentCourse ? catalog.get(profile.currentCourse.slug) : undefined;
  const badges = profile.badges.flatMap((b) => {
    const course = catalog.get(b.courseSlug);
    return course ? [{ ...b, name: course.badge.name, icon: course.badge.icon }] : [];
  });

  return (
    <div className="mg-friend-profile">
      <section className="mg-friend-profile__hero">
        <FriendAvatar idKey={profile.id} orb={profile.orb} initials={profile.initials} progress={profile.progress} size="lg" />
        <h1 className="mg-friend-profile__name">{profile.name}</h1>
        <span>{t('level', { level: profile.level, name: tg(`levels.${profile.levelKey}.name`) })}</span>
        <span className="mg-friend-profile__meta">{t('since', { date: fmt.format(new Date(profile.friendsSince)) })}</span>
      </section>

      <section className="mg-friend-profile__stats" aria-label={t('streakTitle')}>
        <div className="mg-friend-profile__stat">
          <MagicIcon name="flame" size="md" decorative />
          <span className="mg-friend-profile__value">{profile.magicStreak}</span>
          <span className="mg-friend-profile__label">{t('streakNow')}</span>
        </div>
        <div className="mg-friend-profile__stat">
          <MagicIcon name="star" size="md" decorative />
          <span className="mg-friend-profile__value">{profile.bestMagicStreak}</span>
          <span className="mg-friend-profile__label">{t('streakBest')}</span>
        </div>
      </section>

      <GlassCard title={t('coursesTitle')}>
        <div className="mg-friend-profile__courses">
          <p>{t('coursesDone', { n: profile.coursesCompleted })}</p>
          {current && profile.currentCourse && (
            <>
              <p>{t('courseNow', { course: current.title, done: profile.currentCourse.done, total: profile.currentCourse.total })}</p>
              <div
                className="mg-friend-profile__bar"
                role="progressbar"
                aria-label={current.title}
                aria-valuemin={0}
                aria-valuemax={profile.currentCourse.total}
                aria-valuenow={profile.currentCourse.done}
              >
                <div
                  className="mg-friend-profile__fill"
                  style={{ width: `${Math.round((100 * profile.currentCourse.done) / Math.max(1, profile.currentCourse.total))}%` }}
                />
              </div>
            </>
          )}
        </div>
      </GlassCard>

      {badges.length > 0 && (
        <GlassCard className="mg-badges mg-friend-profile__badges" title={tb('title')}>
          <ul className="mg-badges__grid">
            {badges.map((b) => (
              <li key={b.courseSlug} className="mg-badges__slot mg-badges__slot--earned">
                <span className="mg-badges__icon">
                  <MagicIcon name={b.icon} size="lg" decorative />
                </span>
                <span className="mg-badges__name">{b.name}</span>
                <span className="mg-badges__date">{tb('earned', { date: fmt.format(new Date(b.earnedAt)) })}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {profile.bigThree && (
        <GlassCard title={t('skyTitle')}>
          <ul className="mg-friend-profile__sky">
            {(
              [
                ['sun', profile.bigThree.sun],
                ['moon', profile.bigThree.moon],
                ['asc', profile.bigThree.asc],
              ] as const
            ).map(([k, sign]) =>
              sign ? (
                <li key={k}>
                  <MagicIcon name={ZODIAC_ICON[sign]} size="md" decorative />
                  <span className="mg-friend-profile__label">{t(`sky.${k}`)}</span>
                  <span>{ta(`signs.${sign}`)}</span>
                </li>
              ) : null,
            )}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
