import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { Prisma, type GuideStatus, type RecapKind } from '@prisma/client';
import { db } from '@/lib/db';
import { todayInTz } from '@/lib/dates';
import { guideModel } from '@/lib/env';
import { hasGuideConsent } from './consent';
import { getEntitlements } from '@/lib/entitlements/server';
import { completeJson, type ChatMessage } from '@/lib/ai/openai';
import { isEnded, recapPeriod, type RecapPeriod } from '@/lib/recap/period';
import { buildGuideInput, inputHash, isSufficient } from './input';
import { buildGuideMessages, GUIDE_PROMPT_VERSION } from './prompt';
import { detectDistress } from './safety';
import { guideReportSchema } from './schema';
import { normalize, validateGuideReport } from './validate';
import { loadGuideData } from './server';

/**
 * Geração do Guia (F14). Só corre em Inngest (nunca num request de página).
 * Três portões antes de qualquer chamada: acesso (`guide`), consentimento da versão actual e período acabado;
 * depois dados suficientes e a detecção de sofrimento (modo apoio sem chamar a IA).
 */
export const GUIDE_MAX_OUTPUT_TOKENS = 1500;
export const MAX_REGENERATIONS = 1;

export type GuideOutcome = GuideStatus | 'skipped';

/** Portões que não dependem do conteúdo. `null` se algum falhar. */
export async function guideGate(userId: string, kind: RecapKind, periodKey: string): Promise<RecapPeriod | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { timezone: true, guideConsentAt: true, guideConsentVersion: true },
  });
  if (!user || !hasGuideConsent(user)) return null;
  if (!(await getEntitlements(userId)).features.guide) return null;
  let period: RecapPeriod;
  try {
    period = recapPeriod(kind, periodKey);
  } catch {
    return null;
  }
  return isEnded(period, todayInTz(user.timezone)) ? period : null;
}

interface SaveData {
  status: GuideStatus;
  locale: string;
  inputHash: string;
  payload?: Prisma.InputJsonValue;
  model?: string;
  tokens?: { input: number; output: number };
  regenerated?: boolean;
}

async function save(userId: string, period: RecapPeriod, d: SaveData): Promise<GuideStatus> {
  const data = {
    locale: d.locale,
    status: d.status,
    payload: d.payload ?? Prisma.DbNull,
    model: d.model ?? null,
    promptVersion: GUIDE_PROMPT_VERSION,
    inputHash: d.inputHash,
    inputTokens: d.tokens?.input ?? null,
    outputTokens: d.tokens?.output ?? null,
    generatedAt: new Date(),
  };
  await db.guideReport.upsert({
    where: { userId_kind_periodKey: { userId, kind: period.kind, periodKey: period.key } },
    create: { userId, kind: period.kind, periodKey: period.key, ...data },
    update: { ...data, ...(d.regenerated ? { regenerations: { increment: 1 }, rating: null, readAt: null } : {}) },
  });
  return d.status;
}

const distressFlag = (data: unknown) =>
  !!data && typeof data === 'object' && (data as { safety?: { distress?: unknown } }).safety?.distress === true;

export async function generateGuideReport(
  userId: string,
  kind: RecapKind,
  periodKey: string,
  opts: { regenerate?: boolean } = {},
): Promise<GuideOutcome> {
  const period = await guideGate(userId, kind, periodKey);
  if (!period) return 'skipped';

  const existing = await db.guideReport.findUnique({
    where: { userId_kind_periodKey: { userId, kind: period.kind, periodKey: period.key } },
    select: { status: true, inputHash: true, regenerations: true },
  });
  const regenerate = !!opts.regenerate;
  if (regenerate) {
    if (existing?.status !== 'READY' || existing.regenerations >= MAX_REGENERATIONS) return 'skipped';
  } else if (existing?.status === 'READY') {
    return 'skipped';
  }

  const data = await loadGuideData(userId, period);
  if (!data) return 'skipped';
  const input = buildGuideInput(data.raw, { hasWellbeingConsent: data.hasWellbeingConsent, includeBody: data.includeBody });
  const hash = inputHash(input);
  const base = { locale: input.locale, inputHash: hash, regenerated: regenerate };

  if (regenerate && existing?.inputHash === hash) return 'skipped'; // nada de novo para ler
  if (!isSufficient(input)) return regenerate ? 'skipped' : save(userId, period, { ...base, status: 'INSUFFICIENT' });
  if (detectDistress(input)) return save(userId, period, { ...base, status: 'SUPPORT' });

  const model = guideModel();
  const prompt = buildGuideMessages(input);
  const messages: ChatMessage[] = [
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user },
  ];
  const tokens = { input: 0, output: 0 };

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await completeJson({ model, name: 'guide_report', schema: guideReportSchema, messages, maxTokens: GUIDE_MAX_OUTPUT_TOKENS });
    tokens.input += res.usage.input;
    tokens.output += res.usage.output;
    // O modelo leu sinais de sofrimento sério: descarta-se a resposta, seja qual for.
    if (distressFlag(res.data)) return save(userId, period, { ...base, status: 'SUPPORT', model, tokens });

    const parsed = guideReportSchema.safeParse(res.data);
    const check = parsed.success ? validateGuideReport(parsed.data, input) : null;
    if (parsed.success && check?.ok) {
      const payload = normalize(parsed.data) as unknown as Prisma.InputJsonValue;
      return save(userId, period, { ...base, status: 'READY', payload, model, tokens });
    }
    const reason = parsed.success
      ? (check as { ok: false; reason: string }).reason
      : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    console.warn(`[guide] Resposta inválida (tentativa ${attempt + 1}).`);
    messages.push(
      { role: 'assistant', content: res.raw },
      { role: 'user', content: `Your answer was rejected: ${reason}\nFix it and reply again with the full JSON, using only the input provided.` },
    );
  }

  // Sem conteúdo nem texto no Sentry: só a falha e o tipo.
  Sentry.captureMessage('guide: duas respostas inválidas', { level: 'warning', tags: { job: 'guide-generate', kind } });
  // Numa regeneração falhada fica a leitura anterior (e a regeneração não se gasta).
  if (regenerate) return 'FAILED';
  return save(userId, period, { ...base, status: 'FAILED', model, tokens });
}
