import { getLocale, getTranslations } from 'next-intl/server';
import { formatLongDate } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import type { DayPageData } from '@/lib/body/queries';
import type { DateISO } from '@/lib/dates';
import { GlassCard } from '@/components/ui/GlassCard';
import { BodyHeader } from './BodyHeader';
import { DayStrip } from './DayStrip';
import { DayMetrics } from './DayMetrics';
import { SetDetails } from './SetDetails';
import { SessionRow } from './SessionSummary';
import { StartSessionButton } from './StartSessionButton';

/** Tab Dia: faixa da semana, métricas, detalhe das séries e sessões; sem treino, "Dia de descanso". */
export async function BodyDayView({ data, trained }: { data: DayPageData; trained: DateISO[] }) {
  const [t, raw] = await Promise.all([getTranslations('fitness.day'), getLocale()]);
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  return (
    <>
      <BodyHeader title={data.date === data.today ? t('today') : formatLongDate(data.date, locale)} />
      <div className="mg-body-shell__main">
        <DayStrip date={data.date} today={data.today} week={data.week} trained={trained} />
        {data.stats ? (
          <>
            <DayMetrics stats={data.stats} />
            <GlassCard title={t('details')}>
              <SetDetails details={data.details} />
            </GlassCard>
            <h2 className="mg-body-section-title">{t('sessions')}</h2>
            <ul className="mg-session-list">
              {data.sessions.map((s) => (
                <li key={s.id}>
                  <SessionRow
                    session={{ id: s.id, name: s.name, date: data.date, startedAt: s.startedAt, durationSec: s.durationSec ?? 0, sets: s.sets }}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="mg-body-empty">{t('rest')}</p>
            {data.date === data.today && <StartSessionButton workoutId={null} label={t('start')} />}
          </>
        )}
      </div>
    </>
  );
}
