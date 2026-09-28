import * as Astronomy from 'astronomy-engine';
import type { MoonPhase } from '@prisma/client';
import type { DailyMoon, MainMoonPhase } from '@/types/astro';
import { dayBoundsUtc, localNoonUtc, type DateISO } from '@/lib/dates';
import { ZODIAC_ORDER, signIndex, signedDeg } from './zodiac';

const MAIN_PHASES: { angle: number; phase: MainMoonPhase }[] = [
  { angle: 0, phase: 'NEW_MOON' },
  { angle: 90, phase: 'FIRST_QUARTER' },
  { angle: 180, phase: 'FULL_MOON' },
  { angle: 270, phase: 'LAST_QUARTER' },
];

export function moonLongitude(t: Date | Astronomy.AstroTime): number {
  return Astronomy.EclipticGeoMoon(t).lon;
}

/** Fase intermédia pelo ângulo Sol–Lua. */
function intermediatePhase(angle: number): MoonPhase {
  if (angle < 90) return 'WAXING_CRESCENT';
  if (angle < 180) return 'WAXING_GIBBOUS';
  if (angle < 270) return 'WANING_GIBBOUS';
  return 'WANING_CRESCENT';
}

/** Fase principal exacta dentro de [start, end), se existir. */
function mainPhaseInRange(start: Date, end: Date): { phase: MainMoonPhase; at: string } | null {
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  for (const { angle, phase } of MAIN_PHASES) {
    const found = Astronomy.SearchMoonPhase(angle, start, days);
    if (found && found.date < end) return { phase, at: found.date.toISOString() };
  }
  return null;
}

/** Instante em que a Lua entra no signo que começa em `boundary` graus. */
function findIngress(start: Date, end: Date, boundary: number): Date | null {
  const found = Astronomy.Search((t) => signedDeg(moonLongitude(t) - boundary), Astronomy.MakeTime(start), Astronomy.MakeTime(end), {
    dt_tolerance_seconds: 1,
  });
  return found ? found.date : null;
}

/**
 * Lua do dia local `date` em `tz`.
 * Regra da fase: se uma fase principal exacta cai no dia, é essa (a lua cheia aparece num só dia);
 * senão, fase intermédia pelo ângulo ao meio-dia local.
 */
export function getDailyMoon(date: DateISO, tz: string): DailyMoon {
  const noon = localNoonUtc(date, tz);
  const { start, end } = dayBoundsUtc(date, tz);

  const phaseAngle = Astronomy.MoonPhase(noon);
  const illumination = Astronomy.Illumination(Astronomy.Body.Moon, noon).phase_fraction;
  const signAtNoon = ZODIAC_ORDER[signIndex(moonLongitude(noon))]!;

  const event = mainPhaseInRange(start, end);

  const startIdx = signIndex(moonLongitude(start));
  const endIdx = signIndex(moonLongitude(end));
  let ingress: DailyMoon['ingress'] = null;
  if (startIdx !== endIdx) {
    const at = findIngress(start, end, endIdx * 30);
    if (at) ingress = { sign: ZODIAC_ORDER[endIdx]!, at: at.toISOString() };
  }

  return {
    phase: event?.phase ?? intermediatePhase(phaseAngle),
    phaseAngle,
    illumination,
    signAtNoon,
    ingress,
    event,
  };
}
