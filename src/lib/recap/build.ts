import type { AppLocale } from '@/i18n/locales';
import type { MoonEvent } from '@/lib/astro/moonCalendar';
import type { RetrogradePeriod, SkyEvent } from '@/lib/astro/skyEvents';
import { compareDates, type DateISO } from '@/lib/dates';
import type { DayLevel } from '@/lib/daily/progress';
import type { MagicIconName } from '@/lib/icons';
import type { HabitCount, PeriodStats } from '@/lib/stats/period';
import { levelFor } from '@/lib/xp/levels';
import { isWindowOpen, xpWindow } from '@/lib/xp/rules';
import type { RecapKindKey, RecapPeriod } from './period';

/**
 * Retrospectiva (F13): constrói os slides a partir de números que a app já calcula. Sem IA.
 * Tom: celebrar, nunca culpar. Slide sem dados é omitido; comparações só quando sobem.
 */
export type GuideAccess = 'locked' | 'soon';

/** Curso concluído no período: título e ícone do emblema já resolvidos (o conteúdo do Grimório não vive em `messages`). */
export interface RecapCourse {
  slug: string;
  title: string;
  icon: MagicIconName;
}

export interface RecapInput {
  period: RecapPeriod;
  today: DateISO;
  now: Date;
  tz: string;
  locale: AppLocale;
  hasWellbeingConsent: boolean;
  guideAccess: GuideAccess; // Fase 14 acrescenta 'ready'
  periodTitle: string; // título da semana ou nome do mês já formatado
  intention: string | null; // intenção da semana ou do mês
  reflectionEmpty: boolean; // reflexão do período por escrever
  stats: PeriodStats;
  prevStats: PeriodStats | null;
  dayLevels: { date: DateISO; level: DayLevel }[];
  dayIntentions: Record<DateISO, string>; // só para o destaque
  glow: { earned: number; prevEarned: number | null; totalBefore: number; totalAfter: number };
  grimoire: { lessons: number; coursesCompleted: RecapCourse[] };
  moonEvents: MoonEvent[];
  skyEvents: SkyEvent[]; // MONTH apenas
  retrogrades: RetrogradePeriod[]; // MONTH apenas
}

export type RecapSlide =
  | { type: 'cover'; kind: RecapKindKey; title: string; from: DateISO; to: DateISO; intention: string | null }
  | {
      type: 'days';
      levels: { date: DateISO; level: DayLevel }[];
      daysTouched: number;
      daysComplete: number;
      daysElapsed: number;
      bestStreak: number;
      moreThanPrev: number | null;
    }
  | { type: 'glow'; earned: number; moreThanPrev: number | null; levelBefore: number; levelAfter: number; progress: number }
  | { type: 'rituals'; morningRitual: HabitCount; nightRitual: HabitCount; morningBanish: HabitCount; nightBanish: HabitCount }
  | { type: 'body'; stretch: HabitCount; workout: HabitCount; water: HabitCount; weight: { firstGrams: number; lastGrams: number; points: number[] } | null }
  | { type: 'rest'; avgWakeMood: number | null; avgMood: number | null; sleepGoal: HabitCount }
  | { type: 'grimoire'; lessons: number; coursesCompleted: RecapCourse[] }
  | { type: 'sky'; moonEvents: MoonEvent[]; skyEvents: SkyEvent[]; retrogrades: RetrogradePeriod[] }
  | { type: 'highlight'; date: DateISO; intention: string | null }
  | { type: 'closing'; kind: RecapKindKey; guide: GuideAccess; reflectionCta: boolean; nextHref: string };

export type RecapSlideType = RecapSlide['type'];

/** Eventos do céu que entram na mensal (as fases da lua vêm de `moonEvents`). */
const MONTH_SKY_TYPES: ReadonlySet<SkyEvent['type']> = new Set(['LUNAR_ECLIPSE', 'SOLAR_ECLIPSE', 'SUN_INGRESS', 'SABBAT']);

/** Diferença só quando sobe; quando desce ou fica igual, não se diz nada. */
export function moreThan(current: number, prev: number | null | undefined): number | null {
  if (prev === null || prev === undefined) return null;
  const diff = current - prev;
  return diff > 0 ? diff : null;
}

/** Melhor dia: o `complete` mais recente; sem nenhum, o `partial` mais recente. */
export function pickHighlight(levels: { date: DateISO; level: DayLevel }[]): DateISO | null {
  const latest = (level: DayLevel) =>
    levels
      .filter((d) => d.level === level)
      .map((d) => d.date)
      .sort(compareDates)
      .pop() ?? null;
  return latest('complete') ?? latest('partial');
}

export function buildRecap(i: RecapInput): RecapSlide[] {
  const { period, stats } = i;
  const slides: RecapSlide[] = [];
  const wellbeing = i.hasWellbeingConsent;

  slides.push({ type: 'cover', kind: period.kind, title: i.periodTitle, from: period.from, to: period.to, intention: i.intention });

  slides.push({
    type: 'days',
    levels: i.dayLevels,
    daysTouched: stats.daysTouched,
    daysComplete: stats.daysComplete,
    daysElapsed: stats.daysElapsed,
    bestStreak: stats.bestStreak,
    moreThanPrev: moreThan(stats.daysTouched, i.prevStats?.daysTouched),
  });

  if (i.glow.earned > 0) {
    const after = levelFor(i.glow.totalAfter);
    slides.push({
      type: 'glow',
      earned: i.glow.earned,
      moreThanPrev: moreThan(i.glow.earned, i.glow.prevEarned),
      levelBefore: levelFor(i.glow.totalBefore).level,
      levelAfter: after.level,
      progress: after.progress,
    });
  }

  const h = stats.habits;
  if ([h.morningRitual, h.nightRitual, h.morningBanish, h.nightBanish].some((x) => x.done > 0)) {
    slides.push({ type: 'rituals', morningRitual: h.morningRitual, nightRitual: h.nightRitual, morningBanish: h.morningBanish, nightBanish: h.nightBanish });
  }

  const points = wellbeing ? stats.weight.points.map((p) => p.grams) : [];
  const weight = points.length >= 2 ? { firstGrams: points[0]!, lastGrams: points[points.length - 1]!, points } : null;
  if ([h.stretch, h.workout, h.water].some((x) => x.done > 0) || weight) {
    slides.push({ type: 'body', stretch: h.stretch, workout: h.workout, water: h.water, weight });
  }

  if (wellbeing && (stats.avgWakeMood !== null || stats.avgMood !== null || h.sleepGoal.done > 0)) {
    slides.push({ type: 'rest', avgWakeMood: stats.avgWakeMood, avgMood: stats.avgMood, sleepGoal: h.sleepGoal });
  }

  if (i.grimoire.lessons > 0 || i.grimoire.coursesCompleted.length > 0) {
    slides.push({ type: 'grimoire', lessons: i.grimoire.lessons, coursesCompleted: i.grimoire.coursesCompleted });
  }

  const isMonth = period.kind === 'MONTH';
  const skyEvents = isMonth ? i.skyEvents.filter((e) => MONTH_SKY_TYPES.has(e.type)) : [];
  const retrogrades = isMonth
    ? i.retrogrades.filter((r) => compareDates(r.start, period.to) <= 0 && (r.end === null || compareDates(r.end, period.from) >= 0))
    : [];
  if (i.moonEvents.length + skyEvents.length + retrogrades.length > 0) {
    slides.push({ type: 'sky', moonEvents: i.moonEvents, skyEvents, retrogrades });
  }

  const best = pickHighlight(i.dayLevels);
  if (best) slides.push({ type: 'highlight', date: best, intention: i.dayIntentions[best] ?? null });

  const reflectionSource = isMonth ? 'MONTH_REFLECTION' : 'WEEK_REFLECTION';
  slides.push({
    type: 'closing',
    kind: period.kind,
    guide: i.guideAccess,
    reflectionCta: i.reflectionEmpty && isWindowOpen(xpWindow(reflectionSource, period.from, i.tz), i.now),
    nextHref: isMonth ? '/month' : '/week',
  });

  return slides;
}
