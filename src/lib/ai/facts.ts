import type { Hemisphere, MoonPhase, ProjectArea, ZodiacSign } from '@prisma/client';
import { addDays, compareDates, formatTimeInTz, localNoonUtc, type DateISO } from '@/lib/dates';
import { getDailyMoon } from '@/lib/astro/moon';
import { getDailySky } from '@/lib/astro/sky';
import { getMoonEvents } from '@/lib/astro/moonCalendar';
import { getRetrogradePeriods, getSkyEvents, type RetroPlanet, type SkyEvent } from '@/lib/astro/skyEvents';
import { bodyLongitude } from '@/lib/astro/natal';
import { signIndex, signedDeg } from '@/lib/astro/zodiac';
import {
  ASPECT_ANGLES, NATAL_POINTS, TRANSIT_BODIES, aspectLabel, findAspects, natalLongitude, orbLimit,
  type Aspect, type AspectType,
} from '@/lib/astro/aspects';
import type { BodyKey, NatalChart } from '@/types/astro';

/**
 * Factos astrológicos calculados em código e entregues à IA. A IA só interpreta.
 * Nada aqui vem do diário do utilizador excepto as intenções (e só se ele o permitir).
 */
export interface DayFacts {
  date: DateISO;
  moon: {
    phase: MoonPhase;
    sign: ZodiacSign;
    illumination: number;
    ingress: { sign: ZodiacSign; time?: string } | null;
    event: { phase: string; time?: string } | null;
  };
  sun: { sign: ZodiacSign; degree: number };
  retrogrades: RetroPlanet[]; // activos neste dia
  skyEvents: { type: string; label: string; time?: string }[]; // do dia (sabbat, eclipse, estação…)
}

export interface Intentions {
  day?: string;
  week?: string;
  period?: string;
  projects?: Partial<Record<ProjectArea, string>>;
}

export interface NatalSummary {
  sun: ZodiacSign;
  moon: ZodiacSign;
  ascendant: ZodiacSign | null;
  moonSignUncertain: boolean;
}

export interface PersonalDayFacts extends DayFacts {
  natal: NatalSummary;
  moonTransitHouse: number | null; // casa (signo inteiro) onde a lua passa; null sem hora
  aspects: Aspect[]; // até 5, ao meio-dia local
  intentions?: { day?: string; week?: string; projects?: Partial<Record<ProjectArea, string>> };
}

export interface PeriodFacts {
  from: DateISO;
  to: DateISO;
  moonEvents: { phase: string; date: DateISO; sign: ZodiacSign }[];
  skyEvents: { type: string; label: string; date: DateISO }[];
  retrogrades: { planet: RetroPlanet; start: DateISO; end: DateISO | null }[];
  sunSigns: { sign: ZodiacSign; from: DateISO }[];
}

export interface PersonalPeriodFacts extends PeriodFacts {
  natal: NatalSummary;
  keyAspects: (Aspect & { date: DateISO })[]; // aspectos exactos no período (máx. 8)
  intentions?: { period?: string; projects?: Partial<Record<ProjectArea, string>> };
}

/** Opções: conteúdo partilhado por signo usa UTC, sem horas e sem sabbats (dependem do hemisfério). */
interface FactsOptions {
  shared?: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Rótulo estável (inglês, legível pela IA) de um evento do céu. */
export function skyEventLabel(e: SkyEvent): string {
  switch (e.type) {
    case 'MOON_PHASE': return `${e.phase} in ${e.sign}`;
    case 'LUNAR_ECLIPSE': return `${e.kind} lunar eclipse in ${e.sign}`;
    case 'SOLAR_ECLIPSE': return `${e.kind} solar eclipse in ${e.sign}`;
    case 'SUN_INGRESS': return `Sun enters ${e.sign}`;
    case 'SEASON': return e.season;
    case 'SABBAT': return e.sabbat;
    case 'STATION': return `${e.planet} stations ${e.direction.toLowerCase()} in ${e.sign}`;
  }
}

const excludeForShared = (e: SkyEvent) => e.type !== 'SABBAT';

export function buildDayFacts(date: DateISO, tz: string, hemisphere: Hemisphere, opts: FactsOptions = {}): DayFacts {
  const zone = opts.shared ? 'UTC' : tz;
  const time = (iso: string) => (opts.shared ? undefined : formatTimeInTz(iso, zone));
  const moon = getDailyMoon(date, zone);
  const sky = getDailySky(date, zone);

  const retrogrades = getRetrogradePeriods(date, date, zone)
    .filter((p) => compareDates(p.start, date) <= 0 && (p.end === null || compareDates(date, p.end) <= 0))
    .map((p) => p.planet);

  const skyEvents = getSkyEvents(date, date, zone, hemisphere)
    .filter((e) => e.type !== 'MOON_PHASE')
    .filter((e) => !opts.shared || excludeForShared(e))
    .map((e) => ({ type: e.type, label: skyEventLabel(e), ...(time(e.at) && { time: time(e.at) }) }));

  return {
    date,
    moon: {
      phase: moon.phase,
      sign: moon.signAtNoon,
      illumination: round2(moon.illumination),
      ingress: moon.ingress ? { sign: moon.ingress.sign, ...(time(moon.ingress.at) && { time: time(moon.ingress.at) }) } : null,
      event: moon.event ? { phase: moon.event.phase, ...(time(moon.event.at) && { time: time(moon.event.at) }) } : null,
    },
    sun: { sign: sky.sun.sign, degree: Math.floor(sky.sun.degree) },
    retrogrades: [...new Set(retrogrades)],
    skyEvents,
  };
}

export function natalSummary(chart: NatalChart): NatalSummary {
  return {
    sun: chart.bodies.SUN.sign,
    moon: chart.bodies.MOON.sign,
    ascendant: chart.ascendant?.sign ?? null,
    moonSignUncertain: chart.moonSignUncertain,
  };
}

/** Longitudes dos planetas em trânsito num instante. */
export function transitLongitudes(at: Date): Partial<Record<BodyKey, number>> {
  return Object.fromEntries(TRANSIT_BODIES.map((b) => [b, bodyLongitude(b, at)]));
}

/** Só inclui as intenções com texto (e nunca campos vazios). */
function cleanIntentions<T extends Record<string, unknown>>(i: T | undefined): T | undefined {
  if (!i) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(i)) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    if (v && typeof v === 'object') {
      const inner = Object.fromEntries(Object.entries(v).filter(([, s]) => typeof s === 'string' && s.trim()));
      if (Object.keys(inner).length) out[k] = inner;
    }
  }
  return Object.keys(out).length ? (out as T) : undefined;
}

export function buildPersonalDayFacts(i: {
  date: DateISO;
  tz: string;
  hemisphere: Hemisphere;
  chart: NatalChart;
  intentions?: PersonalDayFacts['intentions'];
}): PersonalDayFacts {
  const base = buildDayFacts(i.date, i.tz, i.hemisphere);
  const noon = localNoonUtc(i.date, i.tz);
  const asc = i.chart.ascendant;
  const moonLon = bodyLongitude('MOON', noon);
  const intentions = cleanIntentions(i.intentions);

  return {
    ...base,
    natal: natalSummary(i.chart),
    moonTransitHouse: asc ? ((signIndex(moonLon) - signIndex(asc.longitude) + 12) % 12) + 1 : null,
    aspects: findAspects(transitLongitudes(noon), i.chart, 5),
    ...(intentions && { intentions }),
  };
}

export function buildPeriodFacts(
  from: DateISO,
  to: DateISO,
  tz: string,
  hemisphere: Hemisphere,
  opts: FactsOptions = {},
): PeriodFacts {
  const zone = opts.shared ? 'UTC' : tz;
  const events = getSkyEvents(from, to, zone, hemisphere).filter((e) => !opts.shared || excludeForShared(e));
  const ingresses = events.filter((e): e is Extract<SkyEvent, { type: 'SUN_INGRESS' }> => e.type === 'SUN_INGRESS');

  return {
    from,
    to,
    moonEvents: getMoonEvents(from, to, zone).map((e) => ({ phase: e.phase, date: e.date, sign: e.sign })),
    skyEvents: events.filter((e) => e.type !== 'MOON_PHASE').map((e) => ({ type: e.type, label: skyEventLabel(e), date: e.date })),
    retrogrades: getRetrogradePeriods(from, to, zone).map((p) => ({ planet: p.planet, start: p.start, end: p.end })),
    sunSigns: [
      { sign: getDailySky(from, zone).sun.sign, from },
      ...ingresses.filter((e) => e.date !== from).map((e) => ({ sign: e.sign, from: e.date })),
    ],
  };
}

const PERIOD_TRANSITS: BodyKey[] = ['SUN', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN'];
const ASPECT_TYPES = Object.keys(ASPECT_ANGLES) as AspectType[];

/**
 * Aspectos exactos no período: amostragem diária ao meio-dia local. Quando a diferença
 * (separação − ângulo do aspecto) muda de sinal entre dois dias, o aspecto é exacto no dia com menor desvio.
 */
export function findExactAspects(
  from: DateISO,
  to: DateISO,
  tz: string,
  chart: NatalChart,
  max = 8,
): (Aspect & { date: DateISO })[] {
  const days: DateISO[] = [];
  for (let d = from; compareDates(d, to) <= 0; d = addDays(d, 1)) days.push(d);
  // Um dia a mais para apanhar aspectos exactos entre o último dia e o seguinte.
  const samples = [...days, addDays(to, 1)].map((d) => ({ date: d, lon: transitLongitudes(localNoonUtc(d, tz)) }));
  const out = new Map<string, Aspect & { date: DateISO }>();

  for (const transit of PERIOD_TRANSITS) {
    for (const point of NATAL_POINTS) {
      const n = natalLongitude(chart, point);
      if (n === null) continue;
      for (const type of ASPECT_TYPES) {
        const dev = (lon: number) => Math.abs(signedDeg(lon - n)) - ASPECT_ANGLES[type];
        for (let k = 0; k + 1 < samples.length; k++) {
          const a = dev(samples[k]!.lon[transit]!);
          const b = dev(samples[k + 1]!.lon[transit]!);
          if (Math.sign(a) === Math.sign(b) || Math.abs(a - b) > 10) continue;
          const [date, d] = Math.abs(a) <= Math.abs(b) ? [samples[k]!.date, a] : [samples[k + 1]!.date, b];
          if (compareDates(date, to) > 0 || Math.abs(d) > orbLimit(type, transit)) continue;
          const label = aspectLabel(transit, type, point);
          out.set(`${label}:${date}`, { transit, natal: point, type, orb: Math.round(Math.abs(d) * 10) / 10, label, date });
        }
      }
    }
  }
  return [...out.values()].sort((x, y) => x.date.localeCompare(y.date) || x.orb - y.orb).slice(0, max);
}

export function buildPersonalPeriodFacts(i: {
  from: DateISO;
  to: DateISO;
  tz: string;
  hemisphere: Hemisphere;
  chart: NatalChart;
  intentions?: PersonalPeriodFacts['intentions'];
}): PersonalPeriodFacts {
  const intentions = cleanIntentions(i.intentions);
  return {
    ...buildPeriodFacts(i.from, i.to, i.tz, i.hemisphere),
    natal: natalSummary(i.chart),
    keyAspects: findExactAspects(i.from, i.to, i.tz, i.chart, 8),
    ...(intentions && { intentions }),
  };
}

/** Todas as datas de eventos (lua e céu) de um período — as únicas datas válidas para rituais. */
export function eventDates(facts: PeriodFacts): Set<DateISO> {
  return new Set([...facts.moonEvents.map((e) => e.date), ...facts.skyEvents.map((e) => e.date)]);
}

