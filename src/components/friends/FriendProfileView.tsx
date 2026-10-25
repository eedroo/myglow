import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { ZODIAC_ICON } from '@/components/ui/ZodiacStrip';
import { intlLocale, isAppLocale } from '@/i18n/locales';
import { publishedCourses } from '@/lib/grimoire/queries';
import type { FriendProfile } from '@/lib/friends/queries';
import { LEVELS } from '@/lib/xp/levels';
import { LightOrb } from './LightOrb';
import { ProfileHero } from './ProfileHero';
import { ProfileQuest, ProfileStats } from './ProfileStats';

const DAY_MS = 86_400_000;

/**
 * Ficha de jogador do amigo: esfera grande, atributos, missão actual, conquistas e constelação (se partilhada).
 * Só campos de `FriendProfile`; nada do diário.
 */
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
  const next = LEVELS.find((l) => l.level === profile.level + 1);
  const daysTogether = Math.max(1, Math.floor((Date.now() - new Date(profile.friendsSince).getTime()) / DAY_MS));

  return (
    <div className="mg-friend-profile">
      <ProfileHero
        idKey={profile.id}
        orb={profile.orb}
        initials={profile.initials}
        name={profile.name}
        handle={profile.handle}
        levelLabel={t('level', { level: profile.level, name: tg(`levels.${profile.levelKey}.name`) })}
        progress={profile.progress}
        xpText={next ? t('toNext', { pct: Math.round(profile.progress * 100), level: next.level }) : t('maxLevel')}
        meta={t('since', { date: fmt.format(new Date(profile.friendsSince)) })}
      />

      <ProfileStats
        label={t('statsTitle')}
        tiles={[
          { key: 'streak', icon: 'flame', value: profile.magicStreak, label: t('streakNow') },
          { key: 'best', icon: 'star', value: profile.bestMagicStreak, label: t('streakBest') },
          { key: 'badges', icon: 'crystal-cluster', value: badges.length, label: t('badgesCount') },
          { key: 'courses', icon: 'grimoire', value: profile.coursesCompleted, label: t('coursesCount') },
          { key: 'days', icon: 'heart', value: daysTogether, label: t('daysTogether') },
        ]}
      />

      {current && profile.currentCourse && (
        <ProfileQuest
          title={t('questTitle')}
          text={t('courseNow', { course: current.title, done: profile.currentCourse.done, total: profile.currentCourse.total })}
          done={profile.currentCourse.done}
          total={profile.currentCourse.total}
        />
      )}

      {badges.length > 0 && (
        <GlassCard className="mg-badges mg-friend-profile__badges" title={t('achievementsTitle')}>
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
                  <span className="mg-friend-profile__sky-orb" aria-hidden="true">
                    <LightOrb signs={{ core: sign, mid: sign, edge: sign }} idKey={`${profile.id}-${k}`} />
                    <span className="mg-friend-profile__glyph">
                      <MagicIcon name={ZODIAC_ICON[sign]} size="sm" decorative />
                    </span>
                  </span>
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
