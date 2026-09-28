import * as Astronomy from 'astronomy-engine';
import type { MoonPhase, ZodiacSign } from '@prisma/client';
import { DateTime } from 'luxon';
import type { MainMoonPhase } from '@/types/astro';
import { addDays, compareDates, dayBoundsUtc, localNoonUtc, type DateISO } from '@/lib/dates';
import { classifyIntermediatePhase, moonLongitude } from './moon';
import { ZODIAC_ORDER, signIndex } from './zodiac';

export interface MoonEvent {
  phase: MainMoonPhase;
  at: string; // ISO UTC
  date: DateISO; // dia local em que acontece
  sign: ZodiacSign; // signo da lua nesse instante
}

export interface MoonDay {
  phase: MoonPhase;
  sign: ZodiacSign;
}

const QUARTERS: MainMoonPhase[] = ['NEW_MOON', 'FIRST_QUARTER', 'FULL_MOON', 'LAST_QUARTER'];

/** Fases principais entre `from` e `to` (inclusivo), em dias locais de `tz`. */
export function getMoonEvents(from: DateISO, to: DateISO, tz: string): MoonEvent[] {
  const start = dayBoundsUtc(from, tz).start;
  const end = dayBoundsUtc(to, tz).end;
  const events: MoonEvent[] = [];

  for (let mq = Astronomy.SearchMoonQuarter(start); mq.time.date < end; mq = Astronomy.NextMoonQuarter(mq)) {
    const at = mq.time.date;
    events.push({
      phase: QUARTERS[mq.quarter]!,
      at: at.toISOString(),
      date: DateTime.fromJSDate(at, { zone: tz }).toISODate() as DateISO,
      sign: ZODIAC_ORDER[signIndex(moonLongitude(at))]!,
    });
  }
  return events;
}

/**
 * Lua de cada dia do intervalo, com as mesmas regras de `getDailyMoon`
 * (fase principal no dia do instante exacto; senão fase intermédia ao meio-dia local)
 * mas com uma só pesquisa de quartos para o intervalo inteiro.
 */
export function getMoonCalendar(from: DateISO, to: DateISO, tz: string): Record<DateISO, MoonDay> {
  const eventByDate = new Map(getMoonEvents(from, to, tz).map((e) => [e.date, e.phase]));
  const out: Record<DateISO, MoonDay> = {};

  for (let d = from; compareDates(d, to) <= 0; d = addDays(d, 1)) {
    const noon = localNoonUtc(d, tz);
    out[d] = {
      phase: eventByDate.get(d) ?? classifyIntermediatePhase(Astronomy.MoonPhase(noon)),
      sign: ZODIAC_ORDER[signIndex(moonLongitude(noon))]!,
    };
  }
  return out;
}
