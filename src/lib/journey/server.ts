import 'server-only';
import { cache } from 'react';
import { db } from '@/lib/db';
import { addDays, fromDbDate, toDbDate, todayInTz } from '@/lib/dates';
import { PROGRESS_SELECT } from '@/lib/daily/progress';
import type { SectionKey } from '@/lib/guided/sections';
import { buildNotification } from '@/lib/notifications/content';
import { deliver } from '@/lib/notifications/send';
import { isUnlockId, type JourneyEntry, type PlannerKey, type UnlockId } from './stages';
import { evaluateJourney, progressToNext, toStage, unlockedPlanners, unlockedSections, type JourneyState } from './state';

/** Dias de diário que a jornada lê (os dias de prática não precisam de ser seguidos). */
const WINDOW_DAYS = 120;

export interface Journey {
  state: JourneyState;
  sections: Set<SectionKey>;
  planners: Set<PlannerKey>;
  /** Mini-lição por ver (a mais antiga), ou null. */
  pendingCeremony: UnlockId | null;
  progress: ReturnType<typeof progressToNext>;
}

async function loadEntries(userId: string, tz: string): Promise<JourneyEntry[]> {
  const today = todayInTz(tz);
  const rows = await db.dailyEntry.findMany({
    where: { userId, date: { gte: toDbDate(addDays(today, -WINDOW_DAYS)), lte: toDbDate(today) } },
    select: { date: true, ...PROGRESS_SELECT },
  });
  return rows.map((r) => ({ ...r, date: fromDbDate(r.date) }));
}

async function loadState(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      timezone: true, locale: true, journeyStage: true, journeyAllUnlockedAt: true,
      journeyUnlocks: { select: { unlockId: true, unlockedAt: true, ceremonySeenAt: true }, orderBy: { unlockedAt: 'asc' } },
      notificationPrefs: { select: { enabled: true } },
    },
  });
  if (!user) return null;
  const state: JourneyState = {
    stage: toStage(user.journeyStage),
    allUnlocked: !!user.journeyAllUnlockedAt,
    extraUnlocks: new Set(user.journeyUnlocks.map((u) => u.unlockId).filter((id): id is UnlockId => isUnlockId(id) && !id.startsWith('stage-'))),
  };
  return { user, state };
}

/** Estado da jornada (sem cache: jobs e notificações). */
export async function loadJourney(userId: string): Promise<Journey> {
  const loaded = await loadState(userId);
  if (!loaded) {
    const state: JourneyState = { stage: 1, allUnlocked: false, extraUnlocks: new Set() };
    return { state, sections: unlockedSections(state), planners: unlockedPlanners(state), pendingCeremony: null, progress: null };
  }
  const { user, state } = loaded;
  const pending = state.allUnlocked ? undefined : user.journeyUnlocks.find((u) => !u.ceremonySeenAt && isUnlockId(u.unlockId));
  const progress = state.allUnlocked || state.stage === 5 ? null : progressToNext(state, await loadEntries(userId, user.timezone));
  return {
    state,
    sections: unlockedSections(state),
    planners: unlockedPlanners(state),
    pendingCeremony: (pending?.unlockId as UnlockId | undefined) ?? null,
    progress,
  };
}

/** Estado da jornada para o pedido actual (uma leitura por pedido; fora de React, p. ex. nos testes, sem cache). */
export const getJourney: (userId: string) => Promise<Journey> = typeof cache === 'function' ? cache(loadJourney) : loadJourney;

/** Secções desbloqueadas (atalho para quem só precisa disto, ex. jobs fora de um pedido). */
export async function journeySections(userId: string): Promise<Set<SectionKey>> {
  return (await getJourney(userId)).sections;
}

/**
 * Avalia a jornada depois de uma gravação do diário ou da semana: grava a etapa e os desbloqueios e avisa
 * (caixa sempre; push com os avisos ligados). Nunca lança: uma falha aqui não pode partir a gravação.
 */
export async function runJourneyEvaluation(userId: string): Promise<UnlockId[]> {
  try {
    const loaded = await loadState(userId);
    if (!loaded || loaded.state.allUnlocked) return [];
    const { user, state } = loaded;
    const needsEntries = state.stage < 5;
    const [entries, weekReflections] = await Promise.all([
      needsEntries ? loadEntries(userId, user.timezone) : Promise.resolve([]),
      state.extraUnlocks.has('month-year') ? Promise.resolve(0) : db.week.count({ where: { userId, reflection: { not: null }, NOT: { reflection: '' } } }),
    ]);
    const r = evaluateJourney({ state, entries, hasWeekReflection: weekReflections > 0 });
    if (r.newUnlocks.length === 0) return [];

    await db.$transaction([
      db.user.update({ where: { id: userId }, data: { journeyStage: r.state.stage } }),
      db.journeyUnlock.createMany({ data: r.newUnlocks.map((unlockId) => ({ userId, unlockId })), skipDuplicates: true }),
    ]);

    const today = todayInTz(user.timezone);
    for (const unlockId of r.newUnlocks) {
      const content = buildNotification('JOURNEY_UNLOCK', { locale: user.locale, date: today, tz: user.timezone, unlockId });
      await deliver(userId, { kind: 'JOURNEY_UNLOCK', periodKey: unlockId, ...content }, { push: !!user.notificationPrefs?.enabled }).catch(
        (err) => console.warn('[journey] Falha ao avisar:', err instanceof Error ? err.message : err),
      );
    }
    return r.newUnlocks;
  } catch (err) {
    console.warn('[journey] Falha na avaliação:', err instanceof Error ? err.message : err);
    return [];
  }
}

/** F19: Mês e Ano bloqueados → a Semana (onde a primeira reflexão os abre). */
export async function requirePlanner(userId: string, planner: PlannerKey): Promise<boolean> {
  return (await getJourney(userId)).planners.has(planner);
}

/** F19: o que o onboarding guiado precisa da jornada (passos bloqueados saltam-se; o cartão some na etapa 5). */
export function tourJourney(j: Journey): { available: SectionKey[]; journeyCard: boolean } {
  return { available: [...j.sections], journeyCard: !j.state.allUnlocked && j.state.stage < 5 };
}
