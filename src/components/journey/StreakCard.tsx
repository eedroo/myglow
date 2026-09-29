import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { nextMilestone } from '@/lib/xp/streak';

interface StreakCardProps {
  current: number;
  best: number;
}

/** Streak mágico actual e melhor, com o próximo marco. Sem mensagens de culpa. */
export async function StreakCard({ current, best }: StreakCardProps) {
  const t = await getTranslations('glow.streak');
  const next = nextMilestone(current);

  return (
    <GlassCard title={t('title')}>
      <div className="mg-streak">
        <MagicIcon name="flame" size="xl" decorative />
        <div className="mg-streak__body">
          <p className="mg-streak__value">{t('value', { n: current })}</p>
          {current === 0 ? (
            <p className="mg-streak__next">{t('zero')}</p>
          ) : (
            <p className="mg-streak__next">{t('next', { days: next.inDays, points: next.points })}</p>
          )}
          <p className="mg-streak__best">{t('best', { n: best })}</p>
          <p className="mg-streak__explain">{t('explain')}</p>
        </div>
      </div>
    </GlassCard>
  );
}
