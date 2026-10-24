import { describe, expect, it, vi } from 'vitest';
import { currentStep, IDLE_TOUR, isOnStepRoute, progress, reduceTour, startTour, tourStateFromDb, type TourState } from './machine';
import { TOUR_STEPS } from './steps';
import { dailyTourEvents, emitTourEvent, onTourEvent, weekTourEvents } from './bus';

const at = (stepId: string, status: TourState['status'] = 'active'): TourState => ({ stepId, status });

describe('máquina do guia', () => {
  it('startTour → passo welcome, active', () => {
    expect(startTour()).toEqual({ stepId: 'welcome', status: 'active' });
    expect(currentStep(startTour())?.target).toBeNull();
  });

  it('em intention, next é ignorado; intention-saved avança para banish', () => {
    expect(reduceTour(at('intention'), 'next')).toEqual(at('intention'));
    expect(reduceTour(at('intention'), 'intention-saved')).toEqual(at('banish'));
  });

  it('skip avança passos opcionais e é ignorado nos obrigatórios', () => {
    expect(reduceTour(at('wake'), 'skip')).toEqual(at('body'));
    expect(reduceTour(at('sky'), 'skip')).toEqual(at('sky'));
    expect(reduceTour(at('first-lesson'), 'skip')).toEqual(at('first-lesson'));
  });

  it('pause mantém o passo; em pausa só resume faz efeito', () => {
    const paused = reduceTour(at('banish'), 'pause');
    expect(paused).toEqual(at('banish', 'paused'));
    expect(reduceTour(paused, 'morning-banish-done')).toEqual(paused);
    expect(reduceTour(paused, 'resume')).toEqual(at('banish'));
  });

  it('back volta um passo (nunca antes do primeiro)', () => {
    expect(reduceTour(at('reading'), 'back')).toEqual(at('sky'));
    expect(reduceTour(at('welcome'), 'back')).toEqual(at('welcome'));
  });

  it('done + next → status done; depois disso nada muda', () => {
    const done = reduceTour(at('done'), 'next');
    expect(done.status).toBe('done');
    expect(reduceTour(done, 'resume')).toEqual(done);
    expect(currentStep(done)).toBeNull();
    expect(reduceTour(IDLE_TOUR, 'next')).toEqual(IDLE_TOUR);
  });

  it('o percurso completo com as acções reais termina em done', () => {
    let s = startTour();
    for (const step of TOUR_STEPS) s = reduceTour(s, step.advanceOn);
    expect(s.status).toBe('done');
  });

  it('progress em banish → 5 de 15', () => {
    expect(progress(at('banish'))).toEqual({ index: 5, total: 15 });
  });

  it('isOnStepRoute: lições do Grimório (não o quiz) e rotas exactas', () => {
    const lesson = TOUR_STEPS.find((s) => s.route === 'lesson')!;
    expect(isOnStepRoute(lesson, '/grimoire/vida-magica/o-que-e-magia')).toBe(true);
    expect(isOnStepRoute(lesson, '/grimoire/vida-magica/quiz')).toBe(false);
    expect(isOnStepRoute(lesson, '/grimoire')).toBe(false);
    expect(isOnStepRoute(TOUR_STEPS[0]!, '/today')).toBe(true);
    expect(isOnStepRoute(TOUR_STEPS[0]!, '/week')).toBe(false);
  });

  it('bus: um evento emitido antes de alguém ouvir chega ao primeiro que começar (só se for recente)', () => {
    emitTourEvent('lesson-opened');
    const cb = vi.fn();
    const off = onTourEvent(cb);
    expect(cb).toHaveBeenCalledWith('lesson-opened');
    off();
  });

  it('eventos a partir do que foi gravado: intenção não vazia, banimento feito, humor ao acordar, intenção da semana', () => {
    expect(dailyTourEvents({ intention: '  ' })).toEqual([]);
    expect(dailyTourEvents({ intention: 'Calma', morningBanishDone: true })).toEqual(['intention-saved', 'morning-banish-done']);
    expect(dailyTourEvents({ morningBanishDone: false, wakeMood: null })).toEqual([]);
    expect(dailyTourEvents({ wakeMood: 4 })).toEqual(['wake-mood-set']);
    expect(weekTourEvents({ intention: 'Foco' })).toEqual(['week-intention-saved']);
    expect(weekTourEvents({})).toEqual([]);
  });

  it('bus: entrega os eventos a quem ouve e deixa de entregar depois de sair', () => {
    const cb = vi.fn();
    const off = onTourEvent(cb);
    emitTourEvent('intention-saved');
    off();
    emitTourEvent('lesson-opened');
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('intention-saved');
  });

  it('estado gravado: passo + pausa, concluído, ou ainda não começou (e passos desconhecidos)', () => {
    const d = new Date();
    expect(tourStateFromDb({ tourStep: 'week', tourPausedAt: null, tourCompletedAt: null })).toEqual(at('week'));
    expect(tourStateFromDb({ tourStep: 'week', tourPausedAt: d, tourCompletedAt: null })).toEqual(at('week', 'paused'));
    expect(tourStateFromDb({ tourStep: null, tourPausedAt: null, tourCompletedAt: d })).toEqual({ stepId: null, status: 'done' });
    expect(tourStateFromDb({ tourStep: null, tourPausedAt: null, tourCompletedAt: null })).toEqual(IDLE_TOUR);
    expect(tourStateFromDb({ tourStep: 'antigo', tourPausedAt: null, tourCompletedAt: null })).toEqual(IDLE_TOUR);
  });
});
