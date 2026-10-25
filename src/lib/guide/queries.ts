import 'server-only';
import type { GuideStatus, RecapKind } from '@prisma/client';
import { db } from '@/lib/db';
import { getEntitlements } from '@/lib/entitlements/server';
import { recapPeriod } from '@/lib/recap/period';
import { hasGuideConsent } from './consent';
import { MAX_REGENERATIONS } from './generate';
import { buildGuideInput, inputHash } from './input';
import { guideReportSchema, type GuideReportPayload } from './schema';
import { loadGuideData } from './server';

/** Leituras do Guia para as páginas (F14). Só lêem: a geração é sempre em Inngest. */
export type GuideState =
  | { status: 'no-access' }
  | { status: 'no-consent' }
  | { status: 'pending' }
  | { status: 'insufficient' }
  | { status: 'support' }
  | { status: 'failed' }
  | { status: 'ready'; report: GuideReportPayload; generatedAt: string; canRegenerate: boolean; rating: number | null };

export async function getGuideState(userId: string, kind: RecapKind, periodKey: string): Promise<GuideState> {
  const [ent, user] = await Promise.all([
    getEntitlements(userId),
    db.user.findUnique({ where: { id: userId }, select: { guideConsentAt: true, guideConsentVersion: true } }),
  ]);
  if (!ent.features.guide) return { status: 'no-access' };
  if (!user || !hasGuideConsent(user)) return { status: 'no-consent' };

  const row = await db.guideReport.findUnique({ where: { userId_kind_periodKey: { userId, kind, periodKey } } });
  if (!row) return { status: 'pending' };
  switch (row.status) {
    case 'INSUFFICIENT': return { status: 'insufficient' };
    case 'SUPPORT': return { status: 'support' };
    case 'FAILED': return { status: 'failed' };
    case 'READY': break;
  }
  const parsed = guideReportSchema.safeParse(row.payload);
  if (!parsed.success) return { status: 'failed' };

  // "Ler de novo" só se ainda há regeneração e se a pessoa escreveu algo novo desde a leitura.
  let canRegenerate = false;
  if (row.regenerations < MAX_REGENERATIONS) {
    const data = await loadGuideData(userId, recapPeriod(kind, periodKey));
    canRegenerate = !!data && inputHash(buildGuideInput(data.raw, { hasWellbeingConsent: data.hasWellbeingConsent })) !== row.inputHash;
  }
  return { status: 'ready', report: parsed.data, generatedAt: row.generatedAt.toISOString(), canRegenerate, rating: row.rating };
}

/** Estado curto (sem ler o diário), para os cartões de entrada. */
export async function getGuideEntryStatus(userId: string, kind: RecapKind, periodKey: string): Promise<'consent' | 'pending' | 'ready' | 'other'> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { guideConsentAt: true, guideConsentVersion: true } });
  if (!user || !hasGuideConsent(user)) return 'consent';
  const row = await db.guideReport.findUnique({ where: { userId_kind_periodKey: { userId, kind, periodKey } }, select: { status: true } });
  if (!row) return 'pending';
  return row.status === 'READY' ? 'ready' : 'other';
}

export interface GuideHistoryItem {
  kind: RecapKind;
  periodKey: string;
  status: GuideStatus;
  generatedAt: string;
  readAt: string | null;
}

export async function listGuideReports(userId: string, limit = 20): Promise<GuideHistoryItem[]> {
  const rows = await db.guideReport.findMany({
    where: { userId },
    orderBy: { generatedAt: 'desc' },
    take: limit,
    select: { kind: true, periodKey: true, status: true, generatedAt: true, readAt: true },
  });
  return rows.map((r) => ({ ...r, generatedAt: r.generatedAt.toISOString(), readAt: r.readAt?.toISOString() ?? null }));
}
