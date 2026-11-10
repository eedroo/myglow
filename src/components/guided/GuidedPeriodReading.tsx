import type { ReactNode } from 'react';
import type { Hemisphere, ProjectArea } from '@prisma/client';
import { getTranslations } from 'next-intl/server';
import { addDays, formatDayMonth, formatLongDate, toDbDate, type DateISO } from '@/lib/dates';
import { db } from '@/lib/db';
import { getDailySky } from '@/lib/astro/sky';
import { weekDays } from '@/lib/weeks';
import { monthOf } from '@/lib/weeks';
import { getCachedSkyEvents } from '@/lib/astro/skyCache';
import { getMonthReading, getWeekReading } from '@/lib/ai/queries';
import { areaInspiration, moonPhaseInspiration, periodMoments, ritualsIn, SUGGESTION, weekDayInspiration, type MoonField, type PeriodRitual, type SkyMoment } from '@/lib/guided/inspiration';
import type { AppLocale } from '@/i18n/locales';
import { MagicIcon } from '@/components/ui/MagicIcon';

export interface PeriodInspiration {
  intention: string[];
  areas: Partial<Record<ProjectArea, string[]>>;
  /** Mês: por fase da lua, a data e o signo (`label`) e o que inspira essa intenção (área, nota da leitura, rituais). */
  moon?: Partial<Record<MoonField, { label: string; items: string[] }>>;
  /** Semana: por dia (domingo a sábado), a data (`label`) e as sugestões pela energia do dia e pelo plano do mês. */
  days?: { label: string; items: string[] }[];
}

/** Os meses que a semana toca, com as intenções da lua e as metas por área já escritas no plano do mês. */
async function weekMonths(userId: string, from: DateISO, to: DateISO) {
  const months = [monthOf(from), monthOf(to)].filter((m, i, a) => i === 0 || m.month !== a[0]!.month);
  return Promise.all(
    months.map(async (m) => {
      const [row, goals] = await Promise.all([
        db.month.findUnique({
          where: { userId_year_month: { userId, year: m.year, month: m.month } },
          select: { moonNew: true, moonWaxing: true, moonFull: true, moonWaning: true },
        }),
        db.projectIntention.findMany({
          where: { userId, period: 'MONTH', periodStart: toDbDate(`${m.year}-${String(m.month).padStart(2, '0')}-01`) },
          select: { area: true, text: true },
        }),
      ]);
      return { ...m, moon: row, goals: goals.filter((g) => g.text.trim() !== '') };
    }),
  );
}

type Kind = 'WEEK' | 'MONTH' | 'YEAR';

async function rituals(userId: string, from: DateISO, to: DateISO): Promise<PeriodRitual[]> {
  // A semana pode tocar dois meses: rituais dos dois.
  const months = [monthOf(from), monthOf(to)].filter((m, i, a) => i === 0 || m.month !== a[0]!.month);
  const all = await Promise.all(months.map((m) => getMonthReading(userId, m.year, m.month)));
  const list = all.flatMap((r) => (r.rituals.status === 'ready' ? r.rituals.data.rituals : []));
  return ritualsIn(list.map((r) => ({ id: r.id, title: r.title, date: r.date, occasion: r.occasion, intention: r.intention, area: r.area })), from, to);
}

/**
 * Antes de planear (F18): a leitura pessoal do período, as datas e fases da lua com o que convidam a fazer e os
 * rituais; e, para cada passo, a inspiração que daí vem (intenção e áreas). Sem leitura do signo.
 */
export async function periodGuidance(i: {
  userId: string;
  kind: Kind;
  from: DateISO;
  to: DateISO;
  tz: string;
  hemisphere: Hemisphere;
  locale: AppLocale;
}): Promise<{ reading: { node: ReactNode; pending: boolean }; inspiration: PeriodInspiration }> {
  const [t, ta, ts, tp, events, personalState, periodRituals] = await Promise.all([
    getTranslations('guided.inspo'),
    getTranslations('astro'),
    getTranslations('sky'),
    getTranslations('projects'),
    getCachedSkyEvents(addDays(i.from, -1), addDays(i.to, 1), i.tz, i.hemisphere),
    i.kind === 'WEEK'
      ? getWeekReading(i.userId, i.from).then((r) => r.personal)
      : i.kind === 'MONTH'
        ? getMonthReading(i.userId, Number(i.from.slice(0, 4)), Number(i.from.slice(5, 7))).then((r) => r.personal)
        : Promise.resolve({ status: 'unavailable' as const }),
    i.kind === 'YEAR' ? Promise.resolve([]) : rituals(i.userId, i.from, i.to),
  ]);
  const personal = personalState.status === 'ready' ? personalState.data : null;
  const moments = periodMoments(events, i.from, i.to, { moonPhases: i.kind !== 'YEAR' });
  const months = i.kind === 'WEEK' ? await weekMonths(i.userId, i.from, i.to) : [];

  const momentName = (m: SkyMoment) => {
    if (m.kind === 'SABBAT') return ts(`sabbats.${m.key}.name` as 'sabbats.SAMHAIN.name');
    if (m.kind === 'SEASON') return ts(`seasons.${m.key}` as 'seasons.MARCH_EQUINOX');
    const sign = m.sign ? ta(`signs.${m.sign}`) : '';
    if (m.kind === 'LUNAR_ECLIPSE') return ts('lunarEclipse', { kind: m.key ?? 'total', sign });
    if (m.kind === 'SOLAR_ECLIPSE') return ts('solarEclipse', { kind: m.key ?? 'total', sign });
    return ts('moonPhase', { phase: ta(`phases.${m.kind}`), sign });
  };
  const momentLine = (m: SkyMoment) => `${formatDayMonth(m.date, i.locale)} · ${momentName(m)}: ${t(`suggest.${SUGGESTION[m.kind]}`)}`;
  const ritualLine = (r: PeriodRitual) => t('ritualLine', { date: formatDayMonth(r.date, i.locale), title: r.title, intention: r.intention });

  const areas = areaInspiration(personal?.focusAreas ?? [], periodRituals);
  // Semana: o brainstorm traz as metas do mês por área e as notas da leitura por área.
  const brainstorm =
    i.kind === 'WEEK'
      ? [
          ...months.flatMap((m) => m.goals.map((g) => t('monthGoal', { area: tp(`areas.${g.area}`), text: g.text.trim() }))),
          ...(personal?.focusAreas ?? []).map((f) => t('areaNote', { area: tp(`areas.${f.area}`), note: f.note })),
        ]
      : [];
  const monthMoon = (date: DateISO, field: MoonField) => {
    const m = months.find((x) => x.year === Number(date.slice(0, 4)) && x.month === Number(date.slice(5, 7)));
    return m?.moon?.[field] ?? null;
  };
  const days =
    i.kind === 'WEEK'
      ? weekDayInspiration(
          weekDays(i.from).map((date) => {
            const sky = getDailySky(date, i.tz);
            return { date, sign: sky.moon.signAtNoon, phase: sky.moon.phase };
          }),
          moments,
          monthMoon,
          periodRituals,
        ).map((d) => ({
          label: formatLongDate(d.date, i.locale),
          items: [
            ...d.monthMoon.map((x) => t(`dayMonthMoon.${x.field}`, { text: x.text })),
            ...d.moments.map((m) => `${momentName(m)}: ${t(`suggest.${SUGGESTION[m.kind]}`)}`),
            t(`daySign.${d.sign}`, { sign: ta(`signs.${d.sign}`) }),
            t(`dayPhase.${d.tone}`),
            ...d.rituals.map(ritualLine),
          ],
        }))
      : undefined;
  const inspiration: PeriodInspiration = {
    intention: [
      ...(personal ? [t('fromReading', { text: personal.headline })] : []),
      ...moments.filter((m) => m.kind === 'NEW_MOON' || m.kind === 'SABBAT' || m.kind === 'SOLAR_ECLIPSE').slice(0, 2).map(momentLine),
      ...brainstorm,
    ],
    ...(days && { days }),
    areas: Object.fromEntries(
      Object.entries(areas).map(([area, a]) => [area, [...(a!.note ? [a!.note] : []), ...a!.rituals.map(ritualLine)]]),
    ) as PeriodInspiration['areas'],
    ...(i.kind === 'MONTH' && {
      moon: Object.fromEntries(
        Object.entries(moonPhaseInspiration(moments, periodRituals, personal?.focusAreas ?? [], i.to)).map(([field, p]) => {
          const label = p!.moments.map((m) => `${formatDayMonth(m.date, i.locale)} · ${momentName(m)}`).join(' · ');
          const area = p!.area ? tp(`areas.${p!.area}`) : null;
          const items = [
            ...(area ? [p!.note ? t('moonAreaNote', { area, note: p!.note }) : t('moonArea', { area })] : []),
            ...p!.rituals.map(ritualLine),
          ];
          return [field, { label, items }];
        }),
      ) as PeriodInspiration['moon'],
    }),
  };

  const node = (
    <div className="mg-guided-reading">
      {personal ? (
        <section>
          <p className="mg-reading__headline">{personal.headline}</p>
          <p className="mg-reading__text">{personal.reading}</p>
          {personal.focusAreas.length > 0 && (
            <ul className="mg-guided-reading__list">
              {personal.focusAreas.map((f) => (
                <li key={f.area}>
                  <strong>{tp(`areas.${f.area}`)}</strong>: {f.note}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="mg-step__help">{i.kind === 'YEAR' ? t('yearNoReading') : personalState.status === 'pending' ? t('pending') : t('noReading')}</p>
      )}
      {moments.length > 0 && (
        <section>
          <p className="mg-reading__label">
            <MagicIcon name="moon-crescent" size="sm" decorative /> {t('datesTitle')}
          </p>
          <ul className="mg-guided-reading__list">
            {moments.map((m) => (
              <li key={`${m.date}-${m.kind}`}>{momentLine(m)}</li>
            ))}
          </ul>
        </section>
      )}
      {periodRituals.length > 0 && (
        <section>
          <p className="mg-reading__label">
            <MagicIcon name="candle" size="sm" decorative /> {t('ritualsTitle')}
          </p>
          <ul className="mg-guided-reading__list">
            {periodRituals.map((r) => (
              <li key={r.id}>{ritualLine(r)}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
  return { reading: { node, pending: personalState.status === 'pending' }, inspiration };
}
