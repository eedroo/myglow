import * as Astronomy from 'astronomy-engine';
import type { Hemisphere, ZodiacSign } from '@prisma/client';
import { DateTime } from 'luxon';
import { dayBoundsUtc, type DateISO } from '@/lib/dates';
import type { MainMoonPhase } from '@/types/astro';
import { getMoonEvents } from './moonCalendar';
import { moonLongitude } from './moon';
import { bodyLongitude } from './natal';
import { ZODIAC_ORDER, signIndex, signedDeg } from './zodiac';

/**
 * Céu do grimório: fases, eclipses, ingressos do Sol, estações, sabbats e estações planetárias.
 * Cálculo local (astronomy-engine), sem API. Datas `date` são dias locais no fuso do utilizador.
 */
export type SabbatKey = 'IMBOLC' | 'OSTARA' | 'BELTANE' | 'LITHA' | 'LUGHNASADH' | 'MABON' | 'SAMHAIN' | 'YULE';
export type RetroPlanet = 'MERCURY' | 'VENUS' | 'MARS';
export type SeasonKey = 'MARCH_EQUINOX' | 'JUNE_SOLSTICE' | 'SEPTEMBER_EQUINOX' | 'DECEMBER_SOLSTICE';

type Base = { at: string; date: DateISO }; // at = ISO UTC; date = dia local

export type SkyEvent =
  | (Base & { type: 'MOON_PHASE'; phase: MainMoonPhase; sign: ZodiacSign })
  | (Base & { type: 'LUNAR_ECLIPSE'; kind: 'penumbral' | 'partial' | 'total'; sign: ZodiacSign })
  | (Base & { type: 'SOLAR_ECLIPSE'; kind: 'partial' | 'annular' | 'total'; sign: ZodiacSign })
  | (Base & { type: 'SUN_INGRESS'; sign: ZodiacSign })
  | (Base & { type: 'SEASON'; season: SeasonKey })
  | (Base & { type: 'SABBAT'; sabbat: SabbatKey })
  | (Base & { type: 'STATION'; planet: RetroPlanet; direction: 'RETROGRADE' | 'DIRECT'; sign: ZodiacSign });

export type SkyEventType = SkyEvent['type'];

export interface RetrogradePeriod {
  planet: RetroPlanet;
  start: DateISO;
  end: DateISO | null; // null se continuar para lá da janela de pesquisa
  startSign: ZodiacSign;
  endSign: ZodiacSign | null;
}

export const RETRO_PLANETS: RetroPlanet[] = ['MERCURY', 'VENUS', 'MARS'];

/** Sabbats do hemisfério Norte pela longitude do Sol; no Sul, o nome da longitude +180°. */
const NORTH_SABBATS: [number, SabbatKey][] = [
  [315, 'IMBOLC'], [0, 'OSTARA'], [45, 'BELTANE'], [90, 'LITHA'],
  [135, 'LUGHNASADH'], [180, 'MABON'], [225, 'SAMHAIN'], [270, 'YULE'],
];
const SABBAT_AT = new Map(NORTH_SABBATS);

export function sabbatFor(longitude: number, hemisphere: Hemisphere): SabbatKey {
  const lon = hemisphere === 'NORTH' ? longitude : (longitude + 180) % 360;
  return SABBAT_AT.get(lon)!;
}

const DAY_MS = 86_400_000;
const localDate = (d: Date, tz: string) => DateTime.fromJSDate(d, { zone: tz }).toISODate() as DateISO;
const signAt = (lon: number) => ZODIAC_ORDER[signIndex(lon)]!;

function range(from: DateISO, to: DateISO, tz: string) {
  return { start: dayBoundsUtc(from, tz).start, end: dayBoundsUtc(to, tz).end };
}

/** Instantes em [start, end) em que o Sol atinge a longitude `target`. */
function sunCrossings(target: number, start: Date, end: Date): Date[] {
  const out: Date[] = [];
  let t = start;
  while (t < end) {
    const found = Astronomy.SearchSunLongitude(target, t, (end.getTime() - t.getTime()) / DAY_MS);
    if (!found || found.date >= end) break;
    out.push(found.date);
    t = new Date(found.date.getTime() + DAY_MS);
  }
  return out;
}

function eclipses(start: Date, end: Date, tz: string): SkyEvent[] {
  const out: SkyEvent[] = [];
  for (let e = Astronomy.SearchLunarEclipse(start); e.peak.date < end; e = Astronomy.NextLunarEclipse(e.peak)) {
    const at = e.peak.date;
    out.push({
      type: 'LUNAR_ECLIPSE',
      kind: e.kind as 'penumbral' | 'partial' | 'total',
      sign: signAt(moonLongitude(at)),
      at: at.toISOString(),
      date: localDate(at, tz),
    });
  }
  for (let e = Astronomy.SearchGlobalSolarEclipse(start); e.peak.date < end; e = Astronomy.NextGlobalSolarEclipse(e.peak)) {
    const at = e.peak.date;
    out.push({
      type: 'SOLAR_ECLIPSE',
      kind: e.kind as 'partial' | 'annular' | 'total',
      sign: signAt(moonLongitude(at)),
      at: at.toISOString(),
      date: localDate(at, tz),
    });
  }
  return out;
}

/** Velocidade aparente (graus/hora) de um planeta; negativa = retrógrado. */
function hourlyRate(planet: RetroPlanet, t: Date): number {
  return signedDeg(bodyLongitude(planet, new Date(t.getTime() + 3_600_000)) - bodyLongitude(planet, t));
}

interface Station {
  planet: RetroPlanet;
  direction: 'RETROGRADE' | 'DIRECT';
  at: Date;
}

/** Estações planetárias em [start, end): amostragem diária e refinamento pela mudança de sinal da velocidade. */
function stations(planet: RetroPlanet, start: Date, end: Date): Station[] {
  const out: Station[] = [];
  let prevT = start;
  let prevRate = hourlyRate(planet, prevT);
  for (let t = new Date(start.getTime() + DAY_MS); t <= end; t = new Date(t.getTime() + DAY_MS)) {
    const rate = hourlyRate(planet, t);
    if (Math.sign(rate) !== Math.sign(prevRate) && rate !== 0) {
      const found = Astronomy.Search(
        (at) => hourlyRate(planet, at.date),
        Astronomy.MakeTime(prevT),
        Astronomy.MakeTime(t),
        { dt_tolerance_seconds: 60 },
      );
      const at = found?.date ?? t;
      if (at >= start && at < end) out.push({ planet, direction: rate < 0 ? 'RETROGRADE' : 'DIRECT', at });
    }
    prevT = t;
    prevRate = rate;
  }
  return out;
}

export function getSkyEvents(from: DateISO, to: DateISO, tz: string, hemisphere: Hemisphere): SkyEvent[] {
  const { start, end } = range(from, to, tz);
  const events: SkyEvent[] = [];

  for (const e of getMoonEvents(from, to, tz)) {
    events.push({ type: 'MOON_PHASE', phase: e.phase, sign: e.sign, at: e.at, date: e.date });
  }

  events.push(...eclipses(start, end, tz));

  for (let k = 0; k < 12; k++) {
    for (const at of sunCrossings(k * 30, start, end)) {
      events.push({ type: 'SUN_INGRESS', sign: ZODIAC_ORDER[k]!, at: at.toISOString(), date: localDate(at, tz) });
    }
  }

  const firstYear = start.getUTCFullYear();
  const lastYear = end.getUTCFullYear();
  for (let y = firstYear; y <= lastYear; y++) {
    const s = Astronomy.Seasons(y);
    const seasons: [SeasonKey, Date][] = [
      ['MARCH_EQUINOX', s.mar_equinox.date],
      ['JUNE_SOLSTICE', s.jun_solstice.date],
      ['SEPTEMBER_EQUINOX', s.sep_equinox.date],
      ['DECEMBER_SOLSTICE', s.dec_solstice.date],
    ];
    for (const [season, at] of seasons) {
      if (at >= start && at < end) events.push({ type: 'SEASON', season, at: at.toISOString(), date: localDate(at, tz) });
    }
  }

  for (const [lon] of NORTH_SABBATS) {
    for (const at of sunCrossings(lon, start, end)) {
      events.push({ type: 'SABBAT', sabbat: sabbatFor(lon, hemisphere), at: at.toISOString(), date: localDate(at, tz) });
    }
  }

  for (const planet of RETRO_PLANETS) {
    for (const st of stations(planet, start, end)) {
      events.push({
        type: 'STATION',
        planet,
        direction: st.direction,
        sign: signAt(bodyLongitude(planet, st.at)),
        at: st.at.toISOString(),
        date: localDate(st.at, tz),
      });
    }
  }

  return events.sort((a, b) => a.at.localeCompare(b.at));
}

/** Períodos retrógrados que tocam [from, to]; procura 120 dias antes e depois para achar início e fim. */
export function getRetrogradePeriods(from: DateISO, to: DateISO, tz: string): RetrogradePeriod[] {
  const { start, end } = range(from, to, tz);
  const windowStart = new Date(start.getTime() - 120 * DAY_MS);
  const windowEnd = new Date(end.getTime() + 120 * DAY_MS);
  const periods: RetrogradePeriod[] = [];

  for (const planet of RETRO_PLANETS) {
    const list = stations(planet, windowStart, windowEnd);
    // Já retrógrado no início da janela: sem início conhecido → ignorar (janela de 120 dias cobre qualquer período).
    for (let i = 0; i < list.length; i++) {
      const st = list[i]!;
      if (st.direction !== 'RETROGRADE') continue;
      const direct = list.slice(i + 1).find((s) => s.direction === 'DIRECT') ?? null;
      const startsBeforeEnd = st.at < end;
      const endsAfterStart = direct === null || direct.at >= start;
      if (!startsBeforeEnd || !endsAfterStart) continue;
      periods.push({
        planet,
        start: localDate(st.at, tz),
        end: direct ? localDate(direct.at, tz) : null,
        startSign: signAt(bodyLongitude(planet, st.at)),
        endSign: direct ? signAt(bodyLongitude(planet, direct.at)) : null,
      });
    }
  }
  return periods.sort((a, b) => a.start.localeCompare(b.start));
}
