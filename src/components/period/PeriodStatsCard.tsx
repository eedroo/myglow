import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';
import { HABIT_KEYS, type PeriodStats } from '@/lib/stats/period';
import { formatGramsAsKg } from '@/lib/weight';

const SPARK_W = 200;
const SPARK_H = 40;

/** Polilinha do peso (normalizada à caixa; sem cores de bom/mau). */
function sparkPoints(grams: number[]): { x: number; y: number }[] {
  const min = Math.min(...grams);
  const max = Math.max(...grams);
  const span = max - min || 1;
  return grams.map((g, i) => ({
    x: grams.length === 1 ? SPARK_W / 2 : (i / (grams.length - 1)) * SPARK_W,
    y: SPARK_H - 4 - ((g - min) / span) * (SPARK_H - 8),
  }));
}

/** Estatísticas de um período (mês ou ano). */
export async function PeriodStatsCard({ stats }: { stats: PeriodStats }) {
  const [t, rawLocale] = await Promise.all([getTranslations('stats'), getLocale()]);
  const locale = String(rawLocale);
  const moodIcon = (m: number | null) => (m === null ? null : (`mood-${Math.min(5, Math.max(1, Math.round(m)))}` as MagicIconName));
  const fmt = (n: number | null) => (n === null ? t('noMood') : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n));
  const points = sparkPoints(stats.weight.points.map((p) => p.grams));

  const numbers: { key: string; label: string; value: string; icon?: MagicIconName | null }[] = [
    { key: 'touched', label: t('daysTouched'), value: t('ofDays', { n: stats.daysTouched, total: stats.daysElapsed }) },
    { key: 'complete', label: t('daysComplete'), value: t('ofDays', { n: stats.daysComplete, total: stats.daysElapsed }) },
    { key: 'current', label: t('currentStreak'), value: t('days', { n: stats.currentStreak }) },
    { key: 'best', label: t('bestStreak'), value: t('days', { n: stats.bestStreak }) },
    { key: 'mood', label: t('avgMood'), value: fmt(stats.avgMood), icon: moodIcon(stats.avgMood) },
    { key: 'wake', label: t('avgWakeMood'), value: fmt(stats.avgWakeMood), icon: moodIcon(stats.avgWakeMood) },
  ];

  return (
    <GlassCard title={t('title')}>
      <div className="mg-stats">
        <dl className="mg-stats__grid">
          {numbers.map((n) => (
            <div key={n.key} className="mg-stats__stat">
              <dt className="mg-stats__label">{n.label}</dt>
              <dd className="mg-stats__value">
                {n.icon && <MagicIcon name={n.icon} size="sm" decorative />}
                {n.value}
              </dd>
            </div>
          ))}
        </dl>

        <section>
          <h3 className="mg-stats__section-title">{t('habitsTitle')}</h3>
          <ul className="mg-stats__habits">
            {HABIT_KEYS.map((h) => {
              const { done, of } = stats.habits[h];
              const pct = of === 0 ? 0 : (done / of) * 100;
              return (
                <li key={h} className="mg-stats__habit">
                  <span>{t(`habits.${h}`)}</span>
                  <span className="mg-stats__habit-count">{t('habitCount', { done, of })}</span>
                  <svg className="mg-stats__bar" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
                    <rect className="mg-stats__bar-track" x="0" y="0" width="100" height="6" rx="3" />
                    {pct > 0 && <rect className="mg-stats__bar-fill" x="0" y="0" width={pct} height="6" rx="3" />}
                  </svg>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h3 className="mg-stats__section-title">{t('weightTitle')}</h3>
          {stats.weight.first === null || stats.weight.last === null ? (
            <p>{t('noWeight')}</p>
          ) : (
            <div className="mg-stats__weight">
              <span>
                {t('weightRange', {
                  first: formatGramsAsKg(stats.weight.first, locale),
                  last: formatGramsAsKg(stats.weight.last, locale),
                })}
              </span>
              {points.length > 1 && (
                <svg
                  className="mg-stats__spark"
                  viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={t('sparkLabel', { n: points.length })}
                >
                  <polyline className="mg-stats__spark-line" points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
                  {points.map((p, i) => (
                    <circle key={i} className="mg-stats__spark-dot" cx={p.x} cy={p.y} r="2" />
                  ))}
                </svg>
              )}
            </div>
          )}
        </section>
      </div>
    </GlassCard>
  );
}
