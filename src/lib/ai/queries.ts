import 'server-only';
import type { Locale, SignContentKind, UserContentKind, ZodiacSign } from '@prisma/client';
import type { z } from 'zod';
import { db } from '@/lib/db';
import { addDays, compareDates, toDbDate, todayInTz, type DateISO } from '@/lib/dates';
import { addMonths, monthKey, monthOf, weekStartOf } from '@/lib/weeks';
import { ensureNatalChart } from '@/lib/astro/ensureNatalChart';
import {
  SIGN_SCHEMAS, USER_SCHEMAS,
  type DayHoroscope, type DayPersonal, type MonthEnergy, type MonthPersonal, type MonthRituals, type Ritual,
  type WeekEnergy, type WeekPersonal,
} from './schemas';

/**
 * Leitura do conteúdo IA para as páginas. Só lê da DB — nunca gera. Conteúdo em falta num período
 * aberto fica `pending` (o cliente pede a geração); passado ou sem mapa natal → `unavailable`.
 */
export type AiState<T> = { status: 'ready'; data: T } | { status: 'pending' } | { status: 'unavailable' };

export type AiKind = SignContentKind | UserContentKind;

export interface AiRequest {
  kind: AiKind;
  periodStart: DateISO;
}

type Scope = 'day' | 'week' | 'month';

const scopeOf = (kind: AiKind): Scope => (kind.startsWith('DAY_') ? 'day' : kind.startsWith('WEEK_') ? 'week' : 'month');
const firstOfMonth = (date: DateISO): DateISO => `${date.slice(0, 7)}-01`;

/**
 * Janela em que se pode pedir geração: o período actual ou o seguinte (amanhã, a próxima semana, o próximo mês).
 * Antes → 'past' (nunca retroactivo); depois → 'far'.
 */
export function aiWindow(kind: AiKind, periodStart: DateISO, today: DateISO): 'past' | 'open' | 'far' {
  const scope = scopeOf(kind);
  const current = scope === 'day' ? today : scope === 'week' ? weekStartOf(today) : firstOfMonth(today);
  let next: DateISO;
  if (scope === 'day') next = addDays(today, 1);
  else if (scope === 'week') next = addDays(current, 7);
  else {
    const { year, month } = addMonths(monthOf(today).year, monthOf(today).month, 1);
    next = `${monthKey(year, month)}-01`;
  }
  if (compareDates(periodStart, current) < 0) return 'past';
  return compareDates(periodStart, next) <= 0 ? 'open' : 'far';
}

interface Ctx {
  userId: string;
  locale: Locale;
  today: DateISO;
  sign: ZodiacSign | null; // signo solar natal (null sem mapa)
  pending: AiRequest[];
}

async function context(userId: string): Promise<Ctx | null> {
  const [user, chart] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { locale: true, timezone: true } }),
    ensureNatalChart(userId),
  ]);
  if (!user) return null;
  return { userId, locale: user.locale, today: todayInTz(user.timezone), sign: chart?.bodies.SUN.sign ?? null, pending: [] };
}

function toState<T>(ctx: Ctx, kind: AiKind, periodStart: DateISO, payload: unknown, schema: z.ZodType<T>): AiState<T> {
  const parsed = payload === undefined ? null : schema.safeParse(payload);
  if (parsed?.success) return { status: 'ready', data: parsed.data };
  if (!ctx.sign || aiWindow(kind, periodStart, ctx.today) !== 'open') return { status: 'unavailable' };
  ctx.pending.push({ kind, periodStart });
  return { status: 'pending' };
}

async function signState<K extends SignContentKind>(ctx: Ctx, kind: K, periodStart: DateISO) {
  const row = ctx.sign
    ? await db.signContent.findUnique({
        where: { kind_periodStart_sign_locale: { kind, periodStart: toDbDate(periodStart), sign: ctx.sign, locale: ctx.locale } },
        select: { payload: true },
      })
    : null;
  return toState(ctx, kind, periodStart, row?.payload, SIGN_SCHEMAS[kind] as z.ZodType<z.infer<(typeof SIGN_SCHEMAS)[K]>>);
}

async function userState<K extends UserContentKind>(ctx: Ctx, kind: K, periodStart: DateISO) {
  const row = await db.userAiContent.findUnique({
    where: { userId_kind_periodStart_locale: { userId: ctx.userId, kind, periodStart: toDbDate(periodStart), locale: ctx.locale } },
    select: { payload: true },
  });
  return toState(ctx, kind, periodStart, row?.payload, USER_SCHEMAS[kind] as z.ZodType<z.infer<(typeof USER_SCHEMAS)[K]>>);
}

const UNAVAILABLE = { status: 'unavailable' } as const;

export async function getDayReading(userId: string, date: DateISO): Promise<{
  horoscope: AiState<DayHoroscope>;
  personal: AiState<DayPersonal>;
  ritualToday: Ritual | null;
  pending: AiRequest[];
}> {
  const ctx = await context(userId);
  if (!ctx) return { horoscope: UNAVAILABLE, personal: UNAVAILABLE, ritualToday: null, pending: [] };
  const [horoscope, personal, rituals] = await Promise.all([
    signState(ctx, 'DAY_HOROSCOPE', date),
    userState(ctx, 'DAY_PERSONAL', date),
    getRituals(ctx.userId, ctx.locale, firstOfMonth(date)),
  ]);
  return { horoscope, personal, ritualToday: rituals?.rituals.find((r) => r.date === date) ?? null, pending: ctx.pending };
}

export async function getWeekReading(userId: string, start: DateISO): Promise<{
  energy: AiState<WeekEnergy>;
  personal: AiState<WeekPersonal>;
  pending: AiRequest[];
}> {
  const ctx = await context(userId);
  if (!ctx) return { energy: UNAVAILABLE, personal: UNAVAILABLE, pending: [] };
  const [energy, personal] = await Promise.all([signState(ctx, 'WEEK_ENERGY', start), userState(ctx, 'WEEK_PERSONAL', start)]);
  return { energy, personal, pending: ctx.pending };
}

export async function getMonthReading(userId: string, year: number, month: number): Promise<{
  energy: AiState<MonthEnergy>;
  personal: AiState<MonthPersonal>;
  rituals: AiState<MonthRituals>;
  pending: AiRequest[];
}> {
  const ctx = await context(userId);
  if (!ctx) return { energy: UNAVAILABLE, personal: UNAVAILABLE, rituals: UNAVAILABLE, pending: [] };
  const start = `${monthKey(year, month)}-01`;
  const [energy, personal, rituals] = await Promise.all([
    signState(ctx, 'MONTH_ENERGY', start),
    userState(ctx, 'MONTH_PERSONAL', start),
    userState(ctx, 'MONTH_RITUALS', start),
  ]);
  return { energy, personal, rituals, pending: ctx.pending };
}

/** Rituais do mês na língua actual (usado pelo ritual do dia e por `addRitualToWeek`). */
export async function getRituals(userId: string, locale: Locale, monthStart: DateISO): Promise<MonthRituals | null> {
  const row = await db.userAiContent.findUnique({
    where: { userId_kind_periodStart_locale: { userId, kind: 'MONTH_RITUALS', periodStart: toDbDate(monthStart), locale } },
    select: { payload: true },
  });
  const parsed = row ? USER_SCHEMAS.MONTH_RITUALS.safeParse(row.payload) : null;
  return parsed?.success ? parsed.data : null;
}
