import 'server-only';
import type { Locale, Prisma, SignContentKind, UserContentKind, ZodiacSign } from '@prisma/client';
import type { z } from 'zod';
import { db } from '@/lib/db';
import { addDays, toDbDate, type DateISO } from '@/lib/dates';
import { monthOf, monthRange } from '@/lib/weeks';
import { ensureNatalChart } from '@/lib/astro/ensureNatalChart';
import { buildDayFacts, buildPeriodFacts, buildPersonalDayFacts, buildPersonalPeriodFacts } from './facts';
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
  locale: Locale;
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
      return { kind, locale, schema: SIGN_SCHEMAS[kind], prompt: dayHoroscope.build(facts, locale), validate: (d) => V.validateDayHoroscope(d, facts) };
    }
    case 'WEEK_ENERGY': {
      const facts = { sign, ...buildPeriodFacts(from, to, 'UTC', 'NORTH', { shared: true }) };
      return { kind, locale, schema: SIGN_SCHEMAS[kind], prompt: weekEnergy.build(facts, locale), validate: (d) => V.validateWeekEnergy(d, facts) };
    }
    case 'MONTH_ENERGY': {
      const facts = { sign, ...buildPeriodFacts(from, to, 'UTC', 'NORTH', { shared: true }) };
      return { kind, locale, schema: SIGN_SCHEMAS[kind], prompt: monthEnergy.build(facts, locale), validate: (d) => V.validateMonthEnergy(d, facts) };
    }
  }
}

// ─── Conteúdo pessoal ──────────────────────────────────────────────────────────────────────────────

/**
 * `null` se o utilizador não existe ou não tem mapa natal. A leitura pessoal usa só o céu e o mapa natal:
 * nada do diário (nem as intenções) é lido ou enviado à IA.
 */
export async function prepareUserPrompt(
  userId: string,
  kind: UserContentKind,
  periodStart: DateISO,
): Promise<PreparedPrompt | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { locale: true, timezone: true, hemisphere: true, pronouns: true },
  });
  if (!user) return null;
  const chart = await ensureNatalChart(userId);
  if (!chart) return null;

  const { locale, timezone: tz, hemisphere, pronouns } = user;
  const { from, to } = periodOf(kind, periodStart);
  const schema = USER_SCHEMAS[kind];

  if (kind === 'DAY_PERSONAL') {
    const facts = buildPersonalDayFacts({ date: from, tz, hemisphere, chart });
    return { kind, locale, schema, prompt: dayPersonal.build(facts, locale, pronouns), validate: (d) => V.validateDayPersonal(d, facts) };
  }

  const facts = buildPersonalPeriodFacts({ from, to, tz, hemisphere, chart });
  switch (kind) {
    case 'WEEK_PERSONAL':
      return { kind, locale, schema, prompt: weekPersonal.build(facts, locale, pronouns), validate: (d) => V.validateWeekPersonal(d, facts) };
    case 'MONTH_PERSONAL':
      return { kind, locale, schema, prompt: monthPersonal.build(facts, locale, pronouns), validate: (d) => V.validateMonthPersonal(d, facts) };
    case 'MONTH_RITUALS':
      return { kind, locale, schema, prompt: monthRituals.build(facts, locale, pronouns), validate: (d) => V.validateMonthRituals(d, facts) };
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
      ? (p.validate(parsed.data as never) ?? V.checkLeaks(parsed.data, p.locale))
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

/** Conteúdo válido e gerado com os prompts actuais (senão é gerado de novo). */
export function isCurrent(row: { payload: unknown; promptVersion: number }, schema: z.ZodTypeAny): boolean {
  return row.promptVersion >= PROMPT_VERSION && schema.safeParse(row.payload).success;
}

// ─── API pública ───────────────────────────────────────────────────────────────────────────────────

export async function generateSignContent(
  kind: SignContentKind,
  periodStart: DateISO,
  sign: ZodiacSign,
  locale: Locale,
): Promise<GenerateOutcome> {
  const key = { kind, periodStart: toDbDate(periodStart), sign, locale };
  const existing = await db.signContent.findUnique({ where: { kind_periodStart_sign_locale: key }, select: { payload: true, promptVersion: true } });
  if (existing && isCurrent(existing, SIGN_SCHEMAS[kind])) return 'exists';

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
  const existing = await db.userAiContent.findUnique({ where: { userId_kind_periodStart_locale: key }, select: { payload: true, promptVersion: true } });
  if (existing && isCurrent(existing, USER_SCHEMAS[kind])) return 'exists';

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
