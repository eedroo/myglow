import type { GuidedFlow, ProjectArea } from '@prisma/client';
import { PROJECT_AREAS } from '@/types/week';
import { isSectionAvailable, type SectionContext, type SectionKey } from './sections';

/**
 * Fluxos do modo guiado como dados (F18). Puro. Um passo por ecrã; cada passo grava pelos hooks da vista normal.
 * `field` é a chave nos valores achatados do runner: campos do diário (`intention`, `morningBanishName`…) ou do
 * período (`intention`, `reflection`, `word`, `weightGrams`, `projects.MAGIC`…).
 */
export type { GuidedFlow };

export type StepKind = 'intro' | 'reading' | 'text' | 'banish' | 'check' | 'scale' | 'bodyChecks' | 'weight' | 'word' | 'closing';

export interface GuidedStep {
  id: string;
  kind: StepKind;
  section: SectionKey | null;
  field?: string;
  area?: ProjectArea;
  optional: boolean;
}

export const GUIDED_FLOWS: GuidedFlow[] = ['DAY_MORNING', 'DAY_BODY', 'DAY_NIGHT', 'WEEK_PLAN', 'WEEK_CLOSE', 'MONTH_PLAN', 'MONTH_CLOSE', 'YEAR_PLAN', 'YEAR_CLOSE'];

const step = (id: string, kind: StepKind, section: SectionKey, field?: string, optional = false): GuidedStep => ({ id, kind, section, ...(field && { field }), optional });
const areas = (section: SectionKey): GuidedStep[] =>
  PROJECT_AREAS.map((area) => ({ id: `${section}-${area}`, kind: 'text', section, field: `projects.${area}`, area, optional: true }));

const MIDDLE: Record<GuidedFlow, GuidedStep[]> = {
  DAY_MORNING: [
    step('reading', 'reading', 'reading'),
    step('intention', 'text', 'intention', 'intention'),
    step('morningBanish', 'banish', 'morningBanish', 'morningBanishName'),
    step('morningRitual', 'check', 'morningRitual', 'morningRitualDone'),
    step('sleep', 'check', 'sleep', 'sleepGoalMet'),
    step('wakeMood', 'scale', 'wakeMood', 'wakeMood'),
  ],
  DAY_BODY: [step('body', 'bodyChecks', 'body')],
  DAY_NIGHT: [
    step('nightBanish', 'banish', 'nightBanish', 'nightBanishName'),
    step('nightRitual', 'check', 'nightRitual', 'nightRitualDone'),
    step('gratitude', 'text', 'gratitude', 'gratitude'),
    step('mood', 'scale', 'mood', 'mood'),
    step('reflection', 'text', 'reflection', 'reflection'),
    step('summary', 'text', 'summary', 'summary', true),
  ],
  WEEK_PLAN: [step('weekIntention', 'text', 'weekIntention', 'intention'), ...areas('weekProjects'), step('weekWeight', 'weight', 'weekWeight', 'weightGrams', true)],
  WEEK_CLOSE: [step('weekReflection', 'text', 'weekReflection', 'reflection')],
  MONTH_PLAN: [step('monthIntention', 'text', 'monthIntention', 'intention'), ...areas('monthProjects')],
  MONTH_CLOSE: [step('monthReflection', 'text', 'monthReflection', 'reflection')],
  YEAR_PLAN: [step('yearWord', 'word', 'yearWord', 'word'), step('yearIntention', 'text', 'yearIntention', 'intention'), ...areas('yearProjects')],
  YEAR_CLOSE: [step('yearReflection', 'text', 'yearReflection', 'reflection')],
};

const INTRO: GuidedStep = { id: 'intro', kind: 'intro', section: null, optional: false };
const CLOSING: GuidedStep = { id: 'closing', kind: 'closing', section: null, optional: false };

/** Passos do fluxo: intro, os disponíveis (`isSectionAvailable`) e closing. */
export function buildFlow(flow: GuidedFlow, ctx: SectionContext): GuidedStep[] {
  return [INTRO, ...MIDDLE[flow].filter((s) => s.section && isSectionAvailable(s.section, ctx)), CLOSING];
}

const filled = (v: unknown) => typeof v === 'string' && v.trim() !== '';

/** Passo feito pelos valores actuais. Intro e leitura nunca prendem; closing nunca está "feito". */
export function isStepDone(s: GuidedStep, values: Record<string, unknown>): boolean {
  const v = s.field ? values[s.field] : undefined;
  switch (s.kind) {
    case 'intro':
    case 'reading':
      return true;
    case 'closing':
      return false;
    case 'text':
    case 'word':
      return filled(v);
    case 'banish':
      return filled(v) && values[s.field!.replace(/Name$/, 'Done')] === true;
    case 'check':
      return v === true;
    case 'scale':
    case 'weight':
      return typeof v === 'number';
    case 'bodyChecks':
      return values.stretchDone === true && values.workoutDone === true && values.waterDone === true;
  }
}

/** Abre no primeiro passo por fazer (depois da intro); com tudo feito, no closing. */
export function firstIncompleteStep(steps: GuidedStep[], values: Record<string, unknown>): number {
  const i = steps.findIndex((s) => s.kind !== 'intro' && !isStepDone(s, values));
  return i === -1 ? steps.length - 1 : i;
}

/** Fluxo a partir do segmento da rota (`morning`, `plan`…). */
export function flowFromRoute(kind: 'day' | 'week' | 'month' | 'year', segment: string): GuidedFlow | null {
  const map: Record<string, Record<string, GuidedFlow>> = {
    day: { morning: 'DAY_MORNING', body: 'DAY_BODY', night: 'DAY_NIGHT' },
    week: { plan: 'WEEK_PLAN', close: 'WEEK_CLOSE' },
    month: { plan: 'MONTH_PLAN', close: 'MONTH_CLOSE' },
    year: { plan: 'YEAR_PLAN', close: 'YEAR_CLOSE' },
  };
  return map[kind]?.[segment] ?? null;
}

/** Segmento da rota de um fluxo (`DAY_MORNING` → `morning`). */
export const routeSegment = (flow: GuidedFlow) => flow.split('_')[1]!.toLowerCase();
