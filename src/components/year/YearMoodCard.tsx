import { getLocale, getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatMonthName } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import type { MonthlyMood } from '@/lib/stats/period';

const W = 600;
const H = 150;
const TOP = 14; // espaço para o número de dias completos
const BASE = 118; // linha de base das barras
const BAR_W = 10;
const COL = W / 12;

/** Humor médio por mês em 12 barras finas (SVG próprio) + dias completos. */
export async function YearMoodCard({ year, months }: { year: number; months: MonthlyMood[] }) {
  const [t, rawLocale] = await Promise.all([getTranslations('year.mood'), getLocale()]);
  const locale = isAppLocale(rawLocale) ? rawLocale : 'pt-PT';
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const barHeight = (mood: number) => ((mood - 0) / 5) * (BASE - TOP - 10);

  return (
    <GlassCard title={t('title')}>
      <svg className="mg-year-mood__chart" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={t('title')}>
        {[1, 3, 5].map((level) => (
          <line
            key={level}
            className="mg-year-mood__grid"
            x1="0"
            x2={W}
            y1={BASE - barHeight(level)}
            y2={BASE - barHeight(level)}
          />
        ))}
        {months.map((m, i) => {
          const name = formatMonthName(year, m.month, locale);
          const cx = i * COL + COL / 2;
          const label =
            m.avgMood === null
              ? t('empty', { month: name })
              : t('bar', { month: name, mood: nf.format(m.avgMood), complete: m.daysComplete });
          const h = m.avgMood === null ? 2 : barHeight(m.avgMood);
          return (
            <g key={m.month} role="img" aria-label={label}>
              <title>{label}</title>
              <rect
                className={m.avgMood === null ? 'mg-year-mood__bar mg-year-mood__bar--empty' : 'mg-year-mood__bar'}
                x={cx - BAR_W / 2}
                y={BASE - h}
                width={BAR_W}
                height={h}
                rx={BAR_W / 2}
              />
              {m.daysComplete > 0 && (
                <text className="mg-year-mood__complete" x={cx} y={BASE - h - 4}>
                  {m.daysComplete}
                </text>
              )}
              <text className="mg-year-mood__label" x={cx} y={BASE + 16} aria-hidden="true">
                {name.slice(0, 3)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mg-year-mood__legend">{t('legend')}</p>
    </GlassCard>
  );
}
