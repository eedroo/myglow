import Link from 'next/link';
import { Settings } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/shell/PageHeader';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';
import { LEVELS } from '@/lib/xp/levels';
import { getGlowHistory, getGlowSummary } from '@/lib/xp/queries';
import { GlowHistoryCard } from './GlowHistoryCard';
import { LevelPathCard } from './LevelPathCard';
import { StreakCard } from './StreakCard';
import { BadgesCard } from './BadgesCard';
import { contentPrefsFor, getBadges } from '@/lib/grimoire/queries';

/** /profile: nível, caminho dos níveis, emblemas do Grimório, streak mágico e histórico de Glow; definições no topo. */
export async function JourneyPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true, locale: true } });
  if (!user) redirect('/login');

  const [t, tg, summary, history, badges] = await Promise.all([
    getTranslations('glow'),
    getTranslations('grimoire.profile'),
    getGlowSummary(session.user.id, user.timezone),
    getGlowHistory(session.user.id, 30),
    getBadges(session.user.id, contentPrefsFor(user.locale)),
  ]);
  const { level } = summary;
  const next = (LEVELS as readonly (typeof LEVELS)[number][])[level.level];

  return (
    <div className="mg-journey">
      <Link href="/settings" className="mg-journey__gear" aria-label={tg('settings')} title={tg('settings')}>
        <Settings size={20} strokeWidth={1.75} aria-hidden="true" />
      </Link>
      <PageHeader title={t('journey.title')} subtitle={t('journey.subtitle')} />
      <section className="mg-journey__summary" aria-label={t('level', { level: level.level })}>
        <MagicIcon name={`level-${level.level}` as MagicIconName} size="xl" decorative />
        <p className="mg-journey__level">
          {t('level', { level: level.level })} · {t(`levels.${level.key}.name`)}
        </p>
        <p className="mg-journey__total">{t('amount', { points: summary.total })}</p>
        <p className="mg-journey__hint">
          {next
            ? t('journey.toNext', { n: next.minXp - summary.total, name: t(`levels.${next.key}.name`) })
            : t('journey.max')}
        </p>
      </section>
      <LevelPathCard total={summary.total} />
      <BadgesCard badges={badges} />
      <StreakCard current={summary.magicStreak} best={summary.bestMagicStreak} />
      <GlowHistoryCard items={history} />
    </div>
  );
}
