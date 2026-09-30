import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { MagicIconName } from '@/lib/icons';
import { LEVELS, levelFor } from '@/lib/xp/levels';

/** Os 7 níveis do Glow; o actual com barra de progresso. */
export async function LevelPathCard({ total }: { total: number }) {
  const t = await getTranslations('glow');
  const current = levelFor(total);

  return (
    <GlassCard title={t('journey.pathTitle')}>
      <ol className="mg-level-path">
        {LEVELS.map((l) => {
          const state = l.level < current.level ? 'done' : l.level === current.level ? 'current' : 'locked';
          const name = t(`levels.${l.key}.name`);
          return (
            <li
              key={l.level}
              className={`mg-level-path__step mg-level-path__step--${state}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <MagicIcon name={`level-${l.level}` as MagicIconName} size="lg" label={name} />
              <span className="mg-level-path__body">
                <span className="mg-level-path__name">{name}</span>
                <span className="mg-level-path__min">
                  {state === 'current' && current.nextMinXp !== null
                    ? t('journey.progressXp', { total, next: current.nextMinXp })
                    : t('journey.minXp', { min: l.minXp })}
                </span>
                {state === 'current' && current.nextMinXp !== null && (
                  <ProgressBar
                    value={total - current.minXp}
                    max={current.nextMinXp - current.minXp}
                    label={t('journey.toNext', {
                      n: current.nextMinXp - total,
                      name: t(`levels.${(LEVELS as readonly { key: string }[])[l.level]!.key}.name`),
                    })}
                  />
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </GlassCard>
  );
}
