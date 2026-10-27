import type { SectionKey } from '@/lib/guided/sections';
import {
  ALWAYS_SECTIONS, PLANNER_SECTIONS, PRACTICE_DAYS, STAGES, stageDef,
  type JourneyEntry, type PlannerKey, type StageDef, type StageNumber, type UnlockId,
} from './stages';

/** F19: estado da jornada de uma pessoa e o que daí está desbloqueado. Única fonte da verdade. Puro. */
export interface JourneyState {
  stage: StageNumber;
  allUnlocked: boolean;
  /** Desbloqueios fora das etapas: 'month-year' (e 'week-projects' se um dia vier antes da etapa 3). */
  extraUnlocks: Set<UnlockId>;
}

export const NEW_JOURNEY: JourneyState = { stage: 1, allUnlocked: false, extraUnlocks: new Set() };

export const toStage = (n: number): StageNumber => Math.min(Math.max(Math.trunc(n) || 1, 1), 5) as StageNumber;

export function unlockedPlanners(s: JourneyState): Set<PlannerKey> {
  return s.allUnlocked || s.stage >= 3 || s.extraUnlocks.has('month-year') ? new Set(['month', 'year']) : new Set();
}

export function unlockedSections(s: JourneyState): Set<SectionKey> {
  const out = new Set<SectionKey>(ALWAYS_SECTIONS);
  for (const def of STAGES) if (s.allUnlocked || def.stage <= s.stage) def.sections.forEach((k) => out.add(k));
  if (s.extraUnlocks.has('week-projects')) out.add('weekProjects');
  for (const p of unlockedPlanners(s)) PLANNER_SECTIONS[p].forEach((k) => out.add(k));
  return out;
}

/** Datas distintas que passam no teste da etapa (os dias não precisam de ser seguidos). */
export function practiceDays(stage: StageDef, entries: JourneyEntry[]): number {
  const test = stage.requirement?.test;
  if (!test) return 0;
  return new Set(entries.filter(test).map((e) => e.date)).size;
}

/**
 * Avalia a jornada depois de uma gravação. Sobe no máximo uma etapa de cada vez (cada mini-lição tem o seu momento);
 * 'month-year' entra com a primeira reflexão da semana ou na etapa 3.
 */
export function evaluateJourney(i: { state: JourneyState; entries: JourneyEntry[]; hasWeekReflection: boolean }): {
  state: JourneyState;
  newUnlocks: UnlockId[];
} {
  const { state } = i;
  if (state.allUnlocked) return { state, newUnlocks: [] };
  const newUnlocks: UnlockId[] = [];
  let stage = state.stage;
  const def = stageDef(stage);
  if (def.requirement && practiceDays(def, i.entries) >= def.requirement.days) {
    stage = toStage(stage + 1);
    newUnlocks.push(stageDef(stage).unlockId!);
  }
  const extraUnlocks = new Set(state.extraUnlocks);
  if (!extraUnlocks.has('month-year') && (i.hasWeekReflection || stage >= 3)) {
    extraUnlocks.add('month-year');
    newUnlocks.push('month-year');
  }
  return { state: { stage, allUnlocked: false, extraUnlocks }, newUnlocks };
}

/** Progresso para a etapa seguinte; null na 5 ou com tudo desbloqueado. */
export function progressToNext(state: JourneyState, entries: JourneyEntry[]): { stage: number; done: number; of: number } | null {
  if (state.allUnlocked) return null;
  const def = stageDef(state.stage);
  if (!def.requirement) return null;
  return { stage: state.stage + 1, done: Math.min(practiceDays(def, entries), PRACTICE_DAYS), of: def.requirement.days };
}
