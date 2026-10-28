import type { DateISO } from '@/lib/dates';
import type { ProgressEntry } from '@/lib/daily/progress';
import type { SectionKey } from '@/lib/guided/sections';

/**
 * F19: a metodologia em 5 etapas. Cada etapa abre secções do diário; para passar à seguinte são precisos 3 dias
 * (não seguidos) que passem no teste. Puro.
 */
export type UnlockId = 'stage-2' | 'stage-3' | 'stage-4' | 'stage-5' | 'week-projects' | 'month-year';
export type PlannerKey = 'month' | 'year';
export type StageNumber = 1 | 2 | 3 | 4 | 5;

/** Uma entrada do diário com a data (o que a jornada precisa para contar dias de prática). */
export type JourneyEntry = ProgressEntry & { date: DateISO };

export interface StageDef {
  stage: StageNumber;
  /** null na etapa 1 (aberta desde o início). */
  unlockId: UnlockId | null;
  /** O que esta etapa abre. */
  sections: SectionKey[];
  /** Para passar à etapa seguinte; null na 5. */
  requirement: { days: 3; test: (e: JourneyEntry) => boolean } | null;
  /** Aprofundar no Grimório. */
  lessonLink: { course: string; lesson: string } | null;
}

export const filled = (v: string | null | undefined) => typeof v === 'string' && v.trim() !== '';

export const PRACTICE_DAYS = 3;

export const STAGES: StageDef[] = [
  {
    stage: 1,
    unlockId: null,
    sections: ['intention', 'gratitude', 'mood', 'weekIntention', 'weekWeight', 'weekReflection'],
    requirement: { days: 3, test: (e) => filled(e.intention) && filled(e.gratitude) },
    lessonLink: null,
  },
  {
    stage: 2,
    unlockId: 'stage-2',
    sections: ['morningBanish', 'nightBanish'],
    requirement: { days: 3, test: (e) => e.morningBanishDone || e.nightBanishDone },
    lessonLink: { course: 'rituais', lesson: 'banimento' },
  },
  {
    stage: 3,
    unlockId: 'stage-3',
    sections: ['morningRitual', 'nightRitual', 'sleep', 'wakeMood', 'weekProjects'],
    requirement: { days: 3, test: (e) => e.morningRitualDone || e.nightRitualDone },
    lessonLink: { course: 'rituais', lesson: 'ritual-matinal' },
  },
  {
    stage: 4,
    unlockId: 'stage-4',
    sections: ['body'],
    requirement: { days: 3, test: (e) => e.stretchDone || e.workoutDone || e.waterDone },
    lessonLink: { course: 'corpo-energia', lesson: 'movimento' },
  },
  {
    stage: 5,
    unlockId: 'stage-5',
    sections: ['reflection', 'summary'],
    requirement: null,
    lessonLink: { course: 'rituais', lesson: 'reflexao' },
  },
];

/** Secções fora da jornada: a leitura do dia e a pesagem (Foco no corpo) estão sempre disponíveis. */
export const ALWAYS_SECTIONS: SectionKey[] = ['reading', 'nightReading', 'dailyWeight'];

/** Secções do Mês e do Ano (abrem com o planner). */
export const PLANNER_SECTIONS: Record<PlannerKey, SectionKey[]> = {
  month: ['monthIntention', 'monthProjects', 'monthReflection'],
  year: ['yearWord', 'yearIntention', 'yearProjects', 'yearReflection'],
};

export const stageDef = (stage: number): StageDef => STAGES[Math.min(Math.max(stage, 1), 5) - 1]!;

/** Mini-lições: o que cada desbloqueio ensina e o curso do Grimório para aprofundar. */
export const UNLOCK_LESSON_LINK: Record<UnlockId, { course: string; lesson: string } | null> = {
  'stage-2': STAGES[1]!.lessonLink,
  'stage-3': STAGES[2]!.lessonLink,
  'stage-4': STAGES[3]!.lessonLink,
  'stage-5': STAGES[4]!.lessonLink,
  'week-projects': null,
  'month-year': null,
};

export const UNLOCK_IDS: UnlockId[] = ['stage-2', 'stage-3', 'stage-4', 'stage-5', 'week-projects', 'month-year'];
export const isUnlockId = (v: unknown): v is UnlockId => typeof v === 'string' && (UNLOCK_IDS as string[]).includes(v);
