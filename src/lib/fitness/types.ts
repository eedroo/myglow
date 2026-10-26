import type { ExerciseMeasure, ProgramKind } from '@prisma/client';
import type { DateISO } from '@/lib/dates';

/** Foco no corpo (F16): tipos de domínio partilhados pelo servidor e pelos componentes. */
export type { ExerciseMeasure, ProgramKind };

export interface ExerciseView {
  id: string;
  source: 'LIBRARY' | 'CUSTOM';
  name: string; // já no locale
  /** Nome em inglês (pesquisa por "squat" numa conta em português). */
  nameEn: string;
  category: string;
  measure: ExerciseMeasure;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  thumb: string | null;
}

export interface SetInput {
  exerciseId: string;
  reps?: number;
  weightGrams?: number;
  durationSec?: number;
}

/** Para pré-preencher: as séries da última sessão em que o exercício foi feito. */
export interface LastPerformance {
  date: DateISO;
  sets: { reps: number | null; weightGrams: number | null; durationSec: number | null }[];
}

export interface SessionSetView {
  id: string;
  order: number;
  reps: number | null;
  weightGrams: number | null;
  durationSec: number | null;
  completedAt: string;
}

export interface ActiveSessionView {
  id: string;
  workoutId: string | null;
  workoutName: string | null;
  startedAt: string;
  restEndsAt: string | null;
  restExerciseId: string | null;
  notes: string | null;
  items: {
    exercise: ExerciseView;
    target: { sets: number | null; repsMin: number | null; repsMax: number | null; sec: number | null; restSec: number };
    doneSets: SessionSetView[];
    last: LastPerformance | null;
  }[];
}

export interface ExerciseHistoryGroup {
  date: DateISO;
  sessionId: string;
  sets: {
    id: string;
    order: number;
    time: string; // ISO; formatado no fuso da pessoa na UI
    restBeforeSec: number | null;
    reps: number | null;
    weightGrams: number | null;
    durationSec: number | null;
  }[];
}
