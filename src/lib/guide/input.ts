import { createHash } from 'node:crypto';
import type { ProjectArea } from '@prisma/client';
import type { AppLocale } from '@/i18n/locales';
import type { DateISO } from '@/lib/dates';
import type { MoonEvent } from '@/lib/astro/moonCalendar';
import { computeDayProgress, type DayLevel, type ProgressEntry } from '@/lib/daily/progress';
import type { PeriodStats } from '@/lib/stats/period';
import { PROJECT_AREAS } from '@/types/week';

/**
 * Entrada do Guia (F14): a primeira vez que texto do diário vai para a IA. Funções puras.
 * Só seguem os campos listados aqui, limpos de contactos (`redact`) e cortados (`clip`).
 * Nunca: nome, email, peso, nota de como acordou, data e local de nascimento.
 */
export const LIMITS = {
  dayField: 500, // caracteres por campo diário (semanal)
  dayFieldMonth: 200, // no mensal os campos diários são mais curtos
  periodField: 1000, // intenções, reflexões, metas da semana/mês
  totalChars: 16000, // se passar: só intention + reflection de cada dia, depois cortam-se os dias mais antigos
  minTextDays: 3, // dias com pelo menos um texto
} as const;

export interface GuideDayInput {
  date: DateISO;
  weekday: number; // 0 = domingo
  level: DayLevel;
  intention?: string;
  morningBanish?: string; // nome do banimento
  nightBanish?: string;
  gratitude?: string;
  reflection?: string;
  summary?: string;
  dayNote?: string; // nota do dia no planner semanal
  habits: { morningRitual: boolean; nightRitual: boolean; morningBanish: boolean; nightBanish: boolean; stretch: boolean; workout: boolean; water: boolean };
}

export interface GuidePeriodText {
  intention?: string;
  reflection?: string;
  projects: Partial<Record<ProjectArea, string>>; // metas/intenções por área
}

export interface GuideInput {
  kind: 'WEEK' | 'MONTH';
  locale: AppLocale;
  from: DateISO;
  to: DateISO;
  period: GuidePeriodText;
  weeks?: (GuidePeriodText & { start: DateISO })[]; // MONTH: as semanas do mês
  days: GuideDayInput[];
  numbers: {
    daysElapsed: number;
    daysTouched: number;
    daysComplete: number;
    bestStreak: number;
    habits: Record<string, { done: number; of: number }>;
    glowEarned: number;
    lessons: number;
    wellbeing?: { avgMood: number | null; avgWakeMood: number | null; sleepGoal: { done: number; of: number } }; // só com consentimento
  };
  sky: { moonEvents: { type: string; date: DateISO; sign: string }[] }; // contexto leve, calculado pela app
  previousFocuses?: string[]; // títulos dos 3 focos do relatório anterior, se existir
}

/** Texto de um período (semana ou mês) tal como vem da base. */
export interface RawPeriodText {
  intention: string | null;
  reflection: string | null;
  projects: { area: ProjectArea; text: string }[];
}

/** Dados recolhidos por `loadGuideData` (server.ts). Podem trazer mais do que segue: o filtro é aqui. */
export interface RawGuideData {
  kind: 'WEEK' | 'MONTH';
  locale: AppLocale;
  from: DateISO;
  to: DateISO;
  period: RawPeriodText;
  weeks?: (RawPeriodText & { start: DateISO })[];
  entries: (ProgressEntry & { date: DateISO })[];
  dayNotes: Record<DateISO, string>;
  stats: PeriodStats;
  glowEarned: number;
  lessons: number;
  moonEvents: MoonEvent[];
  previousFocuses?: string[];
}

const EMAIL_RE = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/giu;
// 9+ dígitos com espaços, pontos, hífens ou parênteses pelo meio (telefones); datas (8 dígitos) não entram.
const PHONE_RE = /(?:\+|\b00)?\d(?:[\s().-]*\d){8,}/gu;
const MASK = '[…]';

/** Retira emails, URLs e telefones; trim; colapsa espaços. */
export function redact(text: string): string {
  return text.replace(EMAIL_RE, MASK).replace(URL_RE, MASK).replace(PHONE_RE, MASK).replace(/\s+/g, ' ').trim();
}

/** Corta a `max` caracteres (com reticências), sem partir pares substitutos. */
export function clip(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars.slice(0, max - 1).join('').trimEnd()}…`;
}

/** Texto limpo e cortado, ou `undefined` se vazio. */
function clean(v: string | null | undefined, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const out = clip(redact(v), max);
  return out ? out : undefined;
}

/** Sem chaves `undefined` (o JSON e o hash ficam iguais para o mesmo conteúdo). */
function compact<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

function periodText(p: RawPeriodText): GuidePeriodText {
  const projects: Partial<Record<ProjectArea, string>> = {};
  for (const area of PROJECT_AREAS) {
    const text = clean(p.projects.find((x) => x.area === area)?.text, LIMITS.periodField);
    if (text) projects[area] = text;
  }
  return compact({ intention: clean(p.intention, LIMITS.periodField), reflection: clean(p.reflection, LIMITS.periodField), projects });
}

const TEXT_FIELDS = ['intention', 'morningBanish', 'nightBanish', 'gratitude', 'reflection', 'summary', 'dayNote'] as const;

const size = (i: GuideInput) => JSON.stringify(i).length;

export function buildGuideInput(raw: RawGuideData, opts: { hasWellbeingConsent: boolean }): GuideInput {
  const wellbeing = opts.hasWellbeingConsent;
  const max = raw.kind === 'WEEK' ? LIMITS.dayField : LIMITS.dayFieldMonth;
  const byDate = new Map(raw.entries.map((e) => [e.date, e]));
  const dates = [...new Set([...raw.entries.map((e) => e.date), ...Object.keys(raw.dayNotes)])]
    .filter((d) => d >= raw.from && d <= raw.to)
    .sort();

  const days: GuideDayInput[] = [];
  for (const date of dates) {
    const e = byDate.get(date);
    const day: GuideDayInput = compact({
      date,
      weekday: new Date(`${date}T00:00:00Z`).getUTCDay(),
      level: computeDayProgress(date, e ?? null, { wellbeing }).level,
      intention: clean(e?.intention, max),
      morningBanish: clean(e?.morningBanishName, max),
      nightBanish: clean(e?.nightBanishName, max),
      gratitude: clean(e?.gratitude, max),
      reflection: clean(e?.reflection, max),
      summary: clean(e?.summary, max),
      dayNote: clean(raw.dayNotes[date], max),
      habits: {
        morningRitual: !!e?.morningRitualDone,
        nightRitual: !!e?.nightRitualDone,
        morningBanish: !!e?.morningBanishDone,
        nightBanish: !!e?.nightBanishDone,
        stretch: !!e?.stretchDone,
        workout: !!e?.workoutDone,
        water: !!e?.waterDone,
      },
    });
    const hasHabit = Object.values(day.habits).some(Boolean);
    if (day.level !== 'empty' || hasHabit || TEXT_FIELDS.some((f) => day[f])) days.push(day);
  }

  const s = raw.stats;
  const { sleepGoal, ...habits } = s.habits;
  const input: GuideInput = {
    kind: raw.kind,
    locale: raw.locale,
    from: raw.from,
    to: raw.to,
    period: periodText(raw.period),
    ...(raw.weeks && { weeks: raw.weeks.map((w) => ({ start: w.start, ...periodText(w) })) }),
    days,
    numbers: {
      daysElapsed: s.daysElapsed,
      daysTouched: s.daysTouched,
      daysComplete: s.daysComplete,
      bestStreak: s.bestStreak,
      habits,
      glowEarned: raw.glowEarned,
      lessons: raw.lessons,
      ...(wellbeing && { wellbeing: { avgMood: s.avgMood, avgWakeMood: s.avgWakeMood, sleepGoal } }),
    },
    sky: { moonEvents: raw.moonEvents.map((m) => ({ type: m.phase, date: m.date, sign: m.sign })) },
    ...(raw.previousFocuses?.length && { previousFocuses: raw.previousFocuses.slice(0, 3) }),
  };

  // Demasiado texto: primeiro só intenção + reflexão por dia; depois cortam-se os dias mais antigos.
  if (size(input) > LIMITS.totalChars) {
    input.days = input.days.map(({ morningBanish: _a, nightBanish: _b, gratitude: _c, summary: _d, dayNote: _e, ...rest }) => rest);
  }
  while (size(input) > LIMITS.totalChars && input.days.length > 0) input.days.shift();
  return input;
}

/** Dias com pelo menos um texto escrito. */
export function textDays(input: GuideInput): number {
  return input.days.filter((d) => TEXT_FIELDS.some((f) => d[f])).length;
}

/** Há o suficiente para uma leitura: 3 dias com texto, ou a reflexão do período escrita. */
export function isSufficient(input: GuideInput): boolean {
  return textDays(input) >= LIMITS.minTextDays || !!input.period.reflection;
}

/** sha256 do input já limpo: o mesmo input não volta à IA. */
export function inputHash(input: GuideInput): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

/** Todos os textos do período (para a detecção de sofrimento). */
export function allTexts(input: GuideInput): string[] {
  const fromPeriod = (p: GuidePeriodText) => [p.intention, p.reflection, ...Object.values(p.projects)];
  return [
    ...fromPeriod(input.period),
    ...(input.weeks ?? []).flatMap(fromPeriod),
    ...input.days.flatMap((d) => TEXT_FIELDS.map((f) => d[f])),
  ].filter((t): t is string => typeof t === 'string' && t.length > 0);
}
