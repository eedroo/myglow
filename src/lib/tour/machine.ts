import { RETIRED_FINAL_STEPS, TOUR_STEPS, type TourEvent, type TourStep } from './steps';

/** Máquina de estados do guia. Pura: os componentes só reagem ao estado. */
export interface TourState {
  stepId: string | null;
  status: 'idle' | 'active' | 'paused' | 'done';
}

export const IDLE_TOUR: TourState = { stepId: null, status: 'idle' };

export function startTour(): TourState {
  return { stepId: TOUR_STEPS[0]!.id, status: 'active' };
}

const indexOf = (id: string | null) => TOUR_STEPS.findIndex((s) => s.id === id);

function advance(state: TourState): TourState {
  const i = indexOf(state.stepId);
  const next = TOUR_STEPS[i + 1];
  return next ? { stepId: next.id, status: 'active' } : { stepId: null, status: 'done' };
}

/**
 * Eventos que não correspondem ao `advanceOn` do passo actual são ignorados; `skip` só avança passos opcionais;
 * em pausa só `resume` faz efeito. Depois do último passo o guia fica `done`.
 */
export function reduceTour(state: TourState, event: TourEvent): TourState {
  if (state.status === 'idle' || state.status === 'done') return state;
  if (state.status === 'paused') return event === 'resume' ? { ...state, status: 'active' } : state;

  const step = currentStep(state);
  if (!step) return state;
  switch (event) {
    case 'pause':
      return { ...state, status: 'paused' };
    case 'resume':
      return state;
    case 'back': {
      const prev = TOUR_STEPS[indexOf(step.id) - 1];
      return prev ? { stepId: prev.id, status: 'active' } : state;
    }
    case 'skip':
      return step.optional ? advance(state) : state;
    default:
      return event === step.advanceOn ? advance(state) : state;
  }
}

export function currentStep(state: TourState): TourStep | null {
  if (state.status !== 'active' && state.status !== 'paused') return null;
  return TOUR_STEPS.find((s) => s.id === state.stepId) ?? null;
}

/** A pessoa está na página do passo? ('lesson' = uma lição do Grimório, não o quiz) */
export function isOnStepRoute(step: TourStep, pathname: string): boolean {
  if (step.route === 'lesson') return /^\/grimoire\/[^/]+\/(?!quiz$)[^/]+$/.test(pathname);
  return pathname === step.route;
}

/** Posição do passo actual (a contar de 1) e total, para o "2 de 15". */
export function progress(state: TourState): { index: number; total: number } {
  return { index: Math.max(0, indexOf(state.stepId)) + 1, total: TOUR_STEPS.length };
}

/** Estado inicial a partir do que está gravado (vem do servidor no layout, sem flash). */
export function tourStateFromDb(u: { tourStep: string | null; tourPausedAt: Date | null; tourCompletedAt: Date | null }): TourState {
  if (u.tourStep && TOUR_STEPS.some((s) => s.id === u.tourStep)) {
    return { stepId: u.tourStep, status: u.tourPausedAt ? 'paused' : 'active' };
  }
  const finished = !!u.tourCompletedAt || (!!u.tourStep && RETIRED_FINAL_STEPS.includes(u.tourStep));
  return finished ? { stepId: null, status: 'done' } : IDLE_TOUR;
}
