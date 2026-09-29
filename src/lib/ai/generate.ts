import 'server-only';
import type { Locale, Prisma, ProjectArea, SignContentKind, UserContentKind, ZodiacSign } from '@prisma/client';
import type { z } from 'zod';
import { db } from '@/lib/db';
import { addDays, toDbDate, type DateISO } from '@/lib/dates';
import { monthOf, monthRange, weekStartOf } from '@/lib/weeks';
import { ensureNatalChart } from '@/lib/astro/ensureNatalChart';
import {
  buildDayFacts, buildPeriodFacts, buildPersonalDayFacts, buildPersonalPeriodFacts,
  type PersonalDayFacts, type PersonalPeriodFacts,
} from './facts';
import { SIGN_SCHEMAS, USER_SCHEMAS, type MonthRituals } from './schemas';
import { finalizeRituals } from './rituals';
import * as V from './validate';
import { PROMPT_VERSION, type PromptPair } from './prompts/system';
import * as dayHoroscope from './prompts/dayHoroscope';
import * as dayPersonal from './prompts/dayPersonal';
import * as weekEnergy from './prompts/weekEnergy';
import * as weekPersonal from './prompts/weekPersonal';
import * as monthEnergy from './prompts/monthEnergy';
import * as monthPersonal from './prompts/monthPersonal';
import * as monthRituals from './prompts/monthRituals';
import { completeJson, modelFor, type AiKind, type ChatMessage } from './openai';

/**
 * Geração de conteúdo IA (só chamada a partir de funções Inngest).
 * Fluxo: já existe (e é válido)? → factos → prompt → OpenAI → Zod → validação semântica (1 retry com a razão) → upsert.
 */
export type GenerateOutcome = 'exists' | 'saved' | 'invalid' | 'unavailable';

export interface PreparedPrompt {
  kind: AiKind;
  schema: z.ZodTypeAny;
  prompt: PromptPair;
  validate: (data: never) => V.ValidationResult;
}

/** Período de um conteúdo: dia, semana (domingo→sábado) ou mês. */
export function periodOf(kind: AiKind, periodStart: DateISO): { from: DateISO; to: DateISO } {
  if (kind.startsWith('DAY_')) return { from: periodStart, to: periodStart };
  if (kind.startsWith('WEEK_')) return { from: periodStart, to: addDays(periodStart, 6) };
  const { year, month } = monthOf(periodStart);
  return monthRange(year, month);
}

// ─── Conteúdo partilhado por signo ─────────────────────────────────────────────────────────────────

/** Factos partilhados: UTC, sem horas e sem sabbats (valem para qualquer fuso e hemisfério). */
export function prepareSignPrompt(kind: SignContentKind, periodStart: DateISO, sign: ZodiacSign, locale: Locale): PreparedPrompt {
  const { from, to } = periodOf(kind, periodStart);
  switch (kind) {
    case 'DAY_HOROSCOPE': {
      const facts = { sign, ...buildDayFacts(from, 'UTC', 'NORTH', { shared: true }) };
      return { kind, schema: SIGN_SCHEMAS[kind], prompt: dayHoroscope.build(facts, locale), validate: (d) => V.validateDayHoroscope(d, facts) };
    }
    case 'WEEK_ENERGY': {
      const facts = { sign, ...buildPeriodFacts(from, to, 'UTC', 'NORTH', { shared: true }) };
      return { kind, schema: SIGN_SCHEMAS[kind], prompt: weekEnergy.build(facts, locale), validate: (d) => V.validateWeekEnergy(d, facts) };
    }
    case 'MONTH_ENERGY': {
      const facts = { sign, ...buildPeriodFacts(from, to, 'UTC', 'NORTH', { shared: true }) };
      return { kind, schema: SIGN_SCHEMAS[kind], prompt: monthEnergy.build(facts, locale), validate: (d) => V.validateMonthEnergy(d, facts) };
    }
  }
}

// ─── Conteúdo pessoal ──────────────────────────────────────────────────────────────────────────────

type ProjectsMap = Partial<Record<ProjectArea, string>>;

async function projectsOf(userId: string, period: 'WEEK' | 'MONTH', periodStart: DateISO): Promise<ProjectsMap> {
  const rows = await db.projectIntention.findMany({
    where: { userId, period, periodStart: toDbDate(periodStart) },
    select: { area: true, text: true },
  });
  return Object.fromEntries(rows.map((r) => [r.area, r.text]));
}

/**
 * Intenções do período — o ÚNICO dado do diário que pode ir para a IA, e só com `aiUseIntentions`.
 * Selects explícitos: nunca ler reflexões, gratidão, resumos, humor, peso, banimentos ou notas.
 */
async function dayIntentions(userId: string, date: DateISO): Promise<PersonalDayFacts['intentions']> {
  const weekStart = weekStartOf(date);
  const [entry, week, projects] = await Promise.all([
    db.dailyEntry.findUnique({ where: { userId_date: { userId, date: toDbDate(date) } }, select: { intention: true } }),
    db.week.findUnique({ where: { userId_startDate: { userId, startDate: toDbDate(weekStart) } }, select: { intention: true } }),
    projectsOf(userId, 'WEEK', weekStart),
  ]);
  return { day: entry?.intention ?? undefined, week: week?.intention ?? undefined, projects };
}

async function periodIntentions(userId: string, kind: UserContentKind, periodStart: DateISO): Promise<PersonalPeriodFacts['intentions']> {
  if (kind === 'WEEK_PERSONAL') {
    const [week, projects] = await Promise.all([
      db.week.findUnique({ where: { userId_startDate: { userId, startDate: toDbDate(periodStart) } }, select: { intention: true } }),
      projectsOf(userId, 'WEEK', periodStart),
    ]);
    return { period: week?.intention ?? undefined, projects };
  }
  const { year, month } = monthOf(periodStart);
  const [row, projects] = await Promise.all([
    db.month.findUnique({ where: { userId_year_month: { userId, year, month } }, select: { intention: true } }),
    projectsOf(userId, 'MONTH', periodStart),
  ]);
  return { period: row?.intention ?? undefined, projects };
}

/** `null` se o utilizador não existe ou não tem mapa natal. */
export async function prepareUserPrompt(
  userId: string,
  kind: UserContentKind,
  periodStart: DateISO,
): Promise<(PreparedPrompt & { locale: Locale }) | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { locale: true, timezone: true, hemisphere: true, aiUseIntentions: true },
  });
  if (!user) return null;
  const chart = await ensureNatalChart(userId);
  if (!chart) return null;

  const { locale, timezone: tz, hemisphere } = user;
  const { from, to } = periodOf(kind, periodStart);
  const schema = USER_SCHEMAS[kind];

  if (kind === 'DAY_PERSONAL') {
    const intentions = user.aiUseIntentions ? await dayIntentions(userId, from) : undefined;
    const facts = buildPersonalDayFacts({ date: from, tz, hemisphere, chart, intentions });
    return { kind, locale, schema, prompt: dayPersonal.build(facts, locale), validate: (d) => V.validateDayPersonal(d, facts) };
  }

  const intentions = user.aiUseIntentions ? await periodIntentions(userId, kind, periodStart) : undefined;
  const facts = buildPersonalPeriodFacts({ from, to, tz, hemisphere, chart, intentions });
  switch (kind) {
    case 'WEEK_PERSONAL':
      return { kind, locale, schema, prompt: weekPersonal.build(facts, locale), validate: (d) => V.validateWeekPersonal(d, facts) };
    case 'MONTH_PERSONAL':
      return { kind, locale, schema, prompt: monthPersonal.build(facts, locale), validate: (d) => V.validateMonthPersonal(d, facts) };
    case 'MONTH_RITUALS':
      return { kind, locale, schema, prompt: monthRituals.build(facts, locale), validate: (d) => V.validateMonthRituals(d, facts) };
  }
}

// ─── Chamada com retry ─────────────────────────────────────────────────────────────────────────────

/** Uma tentativa + 1 retry com a razão da falha. `null` se as duas falharem. */
async function runPrepared(p: PreparedPrompt): Promise<{ data: unknown; model: string } | null> {
  const model = modelFor(p.kind);
  const messages: ChatMessage[] = [
    { role: 'system', content: p.prompt.system },
    { role: 'user', content: p.prompt.user },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, raw } = await completeJson({ model, name: p.kind.toLowerCase(), schema: p.schema, messages });
    const parsed = p.schema.safeParse(data);
    const reason = parsed.success
      ? p.validate(parsed.data as never)
      : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    if (reason === null) return { data: parsed.data, model };

    console.warn(`[ai] ${p.kind}: resposta inválida (tentativa ${attempt + 1}): ${reason}`);
    messages.push(
      { role: 'assistant', content: raw },
      { role: 'user', content: `Your answer was rejected: ${reason}\nFix it and reply again with the full JSON, using only the facts provided.` },
    );
  }
  console.error(`[ai] ${p.kind}: duas respostas inválidas; nada gravado.`);
  return null;
}

// ─── API pública ───────────────────────────────────────────────────────────────────────────────────

export async function generateSignContent(
  kind: SignContentKind,
  periodStart: DateISO,
  sign: ZodiacSign,
  locale: Locale,
): Promise<GenerateOutcome> {
  const key = { kind, periodStart: toDbDate(periodStart), sign, locale };
  const existing = await db.signContent.findUnique({ where: { kind_periodStart_sign_locale: key }, select: { payload: true } });
  if (existing && SIGN_SCHEMAS[kind].safeParse(existing.payload).success) return 'exists';

  const result = await runPrepared(prepareSignPrompt(kind, periodStart, sign, locale));
  if (!result) return 'invalid';

  const payload = result.data as Prisma.InputJsonValue;
  await db.signContent.upsert({
    where: { kind_periodStart_sign_locale: key },
    create: { ...key, payload, model: result.model, promptVersion: PROMPT_VERSION },
    update: { payload, model: result.model, promptVersion: PROMPT_VERSION },
  });
  return 'saved';
}

export async function generateUserContent(userId: string, kind: UserContentKind, periodStart: DateISO): Promise<GenerateOutcome> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true } });
  if (!user) return 'unavailable';
  const key = { userId, kind, periodStart: toDbDate(periodStart), locale: user.locale };
  const existing = await db.userAiContent.findUnique({ where: { userId_kind_periodStart_locale: key }, select: { payload: true } });
  if (existing && USER_SCHEMAS[kind].safeParse(existing.payload).success) return 'exists';

  const prepared = await prepareUserPrompt(userId, kind, periodStart);
  if (!prepared) return 'unavailable';
  const result = await runPrepared(prepared);
  if (!result) return 'invalid';

  const data = kind === 'MONTH_RITUALS' ? finalizeRituals(result.data as MonthRituals) : result.data;
  const payload = data as Prisma.InputJsonValue;
  await db.userAiContent.upsert({
    where: { userId_kind_periodStart_locale: { ...key, locale: prepared.locale } },
    create: { ...key, locale: prepared.locale, payload, model: result.model, promptVersion: PROMPT_VERSION },
    update: { payload, model: result.model, promptVersion: PROMPT_VERSION },
  });
  return 'saved';
}
