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

// ─── Intenção por lua (plano do mês) ──────────────────────────────────────────────────────────────

export type MoonField = 'moonNew' | 'moonWaxing' | 'moonFull' | 'moonWaning';

/** Cada fase principal da lua e o campo da intenção que lhe corresponde. */
export const MOON_FIELD: Partial<Record<MomentKind, MoonField>> = {
  NEW_MOON: 'moonNew',
  FIRST_QUARTER: 'moonWaxing',
  FULL_MOON: 'moonFull',
  LAST_QUARTER: 'moonWaning',
};

/**
 * A área com que a energia do signo da lua mais combina (para sugerir onde pôr a intenção dessa fase).
 * Fogo e Capricórnio puxam pelo trabalho; Gémeos, Sagitário e Aquário pela mente; Touro e Caranguejo pelo que é
 * pessoal; Leão e Balança pelo prazer e pelos outros; Escorpião e Peixes pela magia; Virgem pela rotina do trabalho.
 */
export const SIGN_AREA: Record<ZodiacSign, ProjectArea> = {
  ARIES: 'PROFESSIONAL', TAURUS: 'PERSONAL', GEMINI: 'STUDIES', CANCER: 'PERSONAL', LEO: 'LEISURE', VIRGO: 'PROFESSIONAL',
  LIBRA: 'LEISURE', SCORPIO: 'MAGIC', SAGITTARIUS: 'STUDIES', CAPRICORN: 'PROFESSIONAL', AQUARIUS: 'STUDIES', PISCES: 'MAGIC',
};

export interface MoonPhaseInspiration {
  /** As datas dessa fase no mês (pode haver duas luas cheias, por exemplo), com o signo. */
  moments: SkyMoment[];
  /** Área com que a energia da fase combina (pelo signo da primeira ocorrência). */
  area: ProjectArea | null;
  /** Nota da leitura pessoal para essa área, se houver. */
  note: string | null;
  /** Rituais do mês entre essa fase e a fase seguinte. */
  rituals: PeriodRitual[];
}

/**
 * Para cada fase principal da lua no mês: as datas, a área que combina, a nota da leitura para essa área e os rituais
 * que caem nessa fase (da data da fase até à fase seguinte). Fases sem ocorrência no mês ficam de fora.
 */
export function moonPhaseInspiration(
  moments: SkyMoment[],
  rituals: PeriodRitual[],
  focusAreas: { area: ProjectArea; note: string }[],
  to: DateISO,
): Partial<Record<MoonField, MoonPhaseInspiration>> {
  const phases = moments.filter((m) => MOON_FIELD[m.kind]).sort((a, b) => compareDates(a.date, b.date));
  const out: Partial<Record<MoonField, MoonPhaseInspiration>> = {};
  phases.forEach((m, i) => {
    const field = MOON_FIELD[m.kind]!;
    const end = phases[i + 1]?.date ?? null;
    const inWindow = (r: PeriodRitual) => compareDates(r.date, m.date) >= 0 && (end ? compareDates(r.date, end) < 0 : compareDates(r.date, to) <= 0);
    const entry = (out[field] ??= { moments: [], area: m.sign ? SIGN_AREA[m.sign] : null, note: null, rituals: [] });
    entry.moments.push(m);
    entry.rituals.push(...rituals.filter(inWindow));
  });
  for (const e of Object.values(out)) e.note = focusAreas.find((f) => f.area === e.area)?.note ?? null;
  return out;
}
