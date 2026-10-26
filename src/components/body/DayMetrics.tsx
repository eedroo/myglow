import { getLocale, getTranslations } from 'next-intl/server';
import { formatGramsAsKg } from '@/lib/weight';
import { formatClock } from '@/lib/fitness/session';
import { isAppLocale, intlLocale } from '@/i18n/locales';
import type { DayStats } from '@/lib/fitness/progress';

const clock = (s: number) => formatClock(s).replace(/^0(\d):/, '$1:');

/** Métricas do dia em grelha de 2 colunas, cada uma com a sua cor fixa. */
export async function DayMetrics({ stats }: { stats: DayStats }) {
  const [t, raw] = await Promise.all([getTranslations('fitness.day.metrics'), getLocale()]);
  const loc = intlLocale(isAppLocale(raw) ? raw : 'pt-PT');
  const items: { kind: string; value: string }[] = [
    { kind: 'sets', value: String(stats.sets) },
    { kind: 'reps', value: String(stats.reps) },
    { kind: 'exercises', value: String(stats.exercises) },
    { kind: 'volume', value: t('kg', { kg: formatGramsAsKg(stats.volumeGrams, loc) }) },
    { kind: 'duration', value: stats.durationSec != null ? clock(stats.durationSec) : '–' },
    { kind: 'rest', value: stats.avgRestSec != null ? clock(stats.avgRestSec) : '–' },
    { kind: 'session', value: clock(stats.sessionTimeSec) },
    { kind: 'prs', value: String(stats.prs) },
  ];
  return (
    <ul className="mg-day-metrics">
      {items.map((m) => (
        <li key={m.kind} className={`mg-day-metrics__metric mg-day-metrics__metric--${m.kind}`}>
          <span className="mg-day-metrics__label">{t(m.kind)}</span>
          <span className="mg-day-metrics__value">{m.value}</span>
        </li>
      ))}
    </ul>
  );
}
