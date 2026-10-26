import type { ProjectArea, ZodiacSign } from '@prisma/client';
import { compareDates, type DateISO } from '@/lib/dates';
import type { SkyEvent } from '@/lib/astro/skyEvents';

/**
 * Inspiração para planear (F18): o que a leitura pessoal e o céu do período sugerem, para mostrar antes de planear
 * e ao lado de cada passo (intenção e áreas). Puro. Sem leitura do signo: só a pessoal, as datas e os rituais.
 */
export type MomentKind = 'NEW_MOON' | 'FIRST_QUARTER' | 'FULL_MOON' | 'LAST_QUARTER' | 'SABBAT' | 'SEASON' | 'LUNAR_ECLIPSE' | 'SOLAR_ECLIPSE';

export interface SkyMoment {
  date: DateISO;
  kind: MomentKind;
  sign: ZodiacSign | null;
  /** Sabbat, estação ou tipo de eclipse (chave para o nome). */
  key: string | null;
}

/** O que cada momento convida a fazer (texto em `guided.inspo.suggest.*`). */
export type MomentSuggestion = 'begin' | 'act' | 'celebrate' | 'release' | 'sabbat' | 'season' | 'eclipse';

export const SUGGESTION: Record<MomentKind, MomentSuggestion> = {
  NEW_MOON: 'begin',
  FIRST_QUARTER: 'act',
  FULL_MOON: 'celebrate',
  LAST_QUARTER: 'release',
  SABBAT: 'sabbat',
  SEASON: 'season',
  LUNAR_ECLIPSE: 'eclipse',
  SOLAR_ECLIPSE: 'eclipse',
};

/**
 * Momentos do período por ordem. Semana e mês: as quatro fases principais da lua, sabbats, estações e eclipses.
 * Ano: sem fases da lua (seriam ~50), só sabbats, estações e eclipses.
 */
export function periodMoments(events: SkyEvent[], from: DateISO, to: DateISO, opts: { moonPhases: boolean }): SkyMoment[] {
  const out: SkyMoment[] = [];
  for (const e of events) {
    if (compareDates(e.date, from) < 0 || compareDates(e.date, to) > 0) continue;
    if (e.type === 'MOON_PHASE' && opts.moonPhases) out.push({ date: e.date, kind: e.phase as MomentKind, sign: e.sign, key: null });
    else if (e.type === 'SABBAT') out.push({ date: e.date, kind: 'SABBAT', sign: null, key: e.sabbat });
    else if (e.type === 'SEASON') out.push({ date: e.date, kind: 'SEASON', sign: null, key: e.season });
    else if (e.type === 'LUNAR_ECLIPSE' || e.type === 'SOLAR_ECLIPSE') out.push({ date: e.date, kind: e.type, sign: e.sign, key: e.kind });
  }
  return out.sort((a, b) => compareDates(a.date, b.date));
}

export interface PeriodRitual {
  id: string;
  title: string;
  date: DateISO;
  occasion: string;
  intention: string;
  area: ProjectArea;
}

/** Rituais com data dentro do período. */
export function ritualsIn(rituals: PeriodRitual[], from: DateISO, to: DateISO): PeriodRitual[] {
  return rituals.filter((r) => compareDates(r.date, from) >= 0 && compareDates(r.date, to) <= 0).sort((a, b) => compareDates(a.date, b.date));
}

export interface AreaInspiration {
  note: string | null;
  rituals: PeriodRitual[];
}

/** Por área: a nota da leitura pessoal (focos) e os rituais dessa área no período. Áreas sem nada ficam de fora. */
export function areaInspiration(focusAreas: { area: ProjectArea; note: string }[], rituals: PeriodRitual[]): Partial<Record<ProjectArea, AreaInspiration>> {
  const out: Partial<Record<ProjectArea, AreaInspiration>> = {};
  for (const f of focusAreas) out[f.area] = { note: f.note, rituals: [] };
  for (const r of rituals) (out[r.area] ??= { note: null, rituals: [] }).rituals.push(r);
  return out;
}
