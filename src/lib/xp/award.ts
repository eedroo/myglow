import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Prisma, XpSource } from '@prisma/client';
import { db } from '@/lib/db';
import { addDays, fromDbDate, toDbDate, type DateISO } from '@/lib/dates';
import { levelFor } from './levels';
import { DAY_SOURCES, type XpCandidate } from './rules';
import { bestRun, runContaining, streakBonusCandidates } from './streak';

export interface XpAward {
  source: XpSource;
  periodStart: DateISO;
  points: number;
  refId?: string;
}

export interface XpResult {
  awards: XpAward[];
  total: number;
  level: number;
  levelUp: boolean;
}

const STREAK_LOOKBACK_DAYS = 400;
const isDaySource = (s: XpSource) => (DAY_SOURCES as readonly XpSource[]).includes(s);

/**
 * Cria o evento se ainda não existir; devolve false se a unique (userId, source, periodStart, refId) já o tem.
 * Usa ON CONFLICT DO NOTHING: em Postgres um erro de unique (P2002) dentro da transacção abortá-la-ia
 * inteira ("current transaction is aborted"), por isso não se pode apanhar o erro e continuar.
 */
export async function tryCreate(tx: Pick<Prisma.TransactionClient, '$queryRaw'>, userId: string, c: XpCandidate): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    INSERT INTO "XpEvent" ("id", "userId", "source", "periodStart", "refId", "points", "createdAt")
    VALUES (${randomUUID()}, ${userId}, ${c.source}::"XpSource", ${c.periodStart}::date, ${c.refId ?? ''}, ${c.points}, NOW())
    ON CONFLICT ("userId", "source", "periodStart", "refId") DO NOTHING
    RETURNING "id"`;
  return rows.length > 0;
}

/**
 * Regista Glow de forma idempotente. O ledger `XpEvent` é a fonte de verdade: `xpTotal` só aumenta
 * com os pontos dos eventos criados de facto nesta transacção. Os candidatos já vêm filtrados por janela.
 */
export async function awardXp(userId: string, candidates: XpCandidate[], ctx: { tz: string; today: DateISO }): Promise<XpResult> {
  return db.$transaction(async (tx) => {
    const created: XpAward[] = [];
    for (const c of candidates) {
      if (await tryCreate(tx, userId, c)) created.push(c);
    }

    const affectedDays = [...new Set(created.filter((a) => isDaySource(a.source)).map((a) => a.periodStart))];
    let bestUpdate: number | undefined;

    if (affectedDays.length > 0) {
      const rows = await tx.xpEvent.findMany({
        where: {
          userId,
          source: { in: [...DAY_SOURCES] },
          periodStart: { gte: toDbDate(addDays(ctx.today, -STREAK_LOOKBACK_DAYS)) },
        },
        select: { periodStart: true },
        distinct: ['periodStart'],
      });
      const dates = rows.map((r) => fromDbDate(r.periodStart));

      const seen = new Set<string>();
      for (const day of affectedDays) {
        const run = runContaining(dates, day);
        if (!run) continue;
        for (const bonus of streakBonusCandidates(run)) {
          if (seen.has(bonus.periodStart)) continue;
          seen.add(bonus.periodStart);
          if (await tryCreate(tx, userId, bonus)) created.push(bonus);
        }
      }
      bestUpdate = bestRun(dates);
    }

    const gained = created.reduce((sum, a) => sum + a.points, 0);
    const current = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { xpTotal: true, levelSeen: true, bestMagicStreak: true },
    });

    const data: Prisma.UserUpdateInput = {};
    if (gained > 0) data.xpTotal = { increment: gained };
    if (bestUpdate !== undefined && bestUpdate > current.bestMagicStreak) data.bestMagicStreak = bestUpdate;

    const total = Object.keys(data).length
      ? (await tx.user.update({ where: { id: userId }, data, select: { xpTotal: true } })).xpTotal
      : current.xpTotal;
    const level = levelFor(total).level;

    return { awards: created, total, level, levelUp: level > current.levelSeen };
  });
}

/** Resultado para devolver ao cliente: só quando há awards ou subida de nível. */
export function xpForClient(r: XpResult | null): XpResult | undefined {
  return r && (r.awards.length > 0 || r.levelUp) ? r : undefined;
}

/**
 * Avalia e regista Glow sem nunca fazer falhar a gravação que o originou:
 * qualquer erro (cálculo ou DB) é registado e a action devolve sem `xp`.
 */
export async function safeAwardXp(
  userId: string,
  buildCandidates: () => XpCandidate[] | Promise<XpCandidate[]>,
  ctx: { tz: string; today: DateISO },
): Promise<XpResult | undefined> {
  try {
    const candidates = await buildCandidates();
    const result = await awardXp(userId, candidates, ctx);
    return xpForClient(result);
  } catch (error) {
    console.error('[glow] falha ao atribuir Glow', error);
    return undefined;
  }
}
