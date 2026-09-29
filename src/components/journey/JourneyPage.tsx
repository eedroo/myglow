import Link from 'next/link';
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

/** /profile: nível, caminho dos níveis, streak mágico e histórico de Glow. */
export async function JourneyPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });
  if (!user) redirect('/login');

  const [t, summary, history] = await Promise.all([
    getTranslations('glow'),
    getGlowSummary(session.user.id, user.timezone),
    getGlowHistory(session.user.id, 30),
  ]);
  const { level } = summary;
  const next = (LEVELS as readonly (typeof LEVELS)[number][])[level.level];

  return (
    <div className="mg-journey">
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
      <StreakCard current={summary.magicStreak} best={summary.bestMagicStreak} />
      <GlowHistoryCard items={history} />
      <Link href="/settings" className="mg-btn mg-btn--ghost mg-journey__settings">
        {t('journey.settings')}
      </Link>
    </div>
  );
}
