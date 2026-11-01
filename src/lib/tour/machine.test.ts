import { describe, expect, it, vi } from 'vitest';
import { currentStep, IDLE_TOUR, isOnStepRoute, progress, reduceTour, startTour, tourStateFromDb, visibleSteps, type TourState } from './machine';
import { TOUR_STEPS } from './steps';
import { NEW_JOURNEY, unlockedSections } from '@/lib/journey/state';
import { dailyTourEvents, emitTourEvent, onTourEvent, weekTourEvents } from './bus';

const at = (stepId: string, status: TourState['status'] = 'active'): TourState => ({ stepId, status });

describe('máquina do guia', () => {
  it('startTour → passo welcome, active', () => {
    expect(startTour()).toEqual({ stepId: 'welcome', status: 'active' });
    expect(currentStep(startTour())?.target).toBeNull();
  });

  it('só o Hoje: abertura, leitura, Manhã, Corpo, Noite, Glow e jornada', () => {
    expect(TOUR_STEPS.map((s) => s.id)).toEqual(['welcome', 'reading', 'morning', 'body', 'night', 'glow', 'journey']);
    expect(TOUR_STEPS.every((s) => s.route === '/today')).toBe(true);
  });

  it('next avança; skip não faz nada (não há passos opcionais)', () => {
    expect(reduceTour(at('reading'), 'next')).toEqual(at('morning'));
    expect(reduceTour(at('morning'), 'skip')).toEqual(at('morning'));
  });

  it('pause mantém o passo; em pausa só resume faz efeito', () => {
    const paused = reduceTour(at('morning'), 'pause');
    expect(paused).toEqual(at('morning', 'paused'));
    expect(reduceTour(paused, 'next')).toEqual(paused);
    expect(reduceTour(paused, 'resume')).toEqual(at('morning'));
  });

  it('back volta um passo (nunca antes do primeiro)', () => {
    expect(reduceTour(at('morning'), 'back')).toEqual(at('reading'));
    expect(reduceTour(at('welcome'), 'back')).toEqual(at('welcome'));
  });

  it('o último passo (jornada) termina o guia; depois disso nada muda', () => {
    const done = reduceTour(at('journey'), 'next');
    expect(done.status).toBe('done');
    expect(reduceTour(done, 'resume')).toEqual(done);
    expect(currentStep(done)).toBeNull();
    expect(reduceTour(IDLE_TOUR, 'next')).toEqual(IDLE_TOUR);
  });

  it('o percurso completo termina em done', () => {
    let s = startTour();
    for (const step of TOUR_STEPS) s = reduceTour(s, step.advanceOn);
    expect(s.status).toBe('done');
  });

  it('progress na Manhã → 3 de 7', () => {
    expect(progress(at('morning'))).toEqual({ index: 3, total: 7 });
  });

  describe('jornada (F19)', () => {
    const stage1 = { available: unlockedSections(NEW_JOURNEY), journeyCard: true };

    it('etapa 1 salta o Corpo; o total conta só os visíveis', () => {
      expect(visibleSteps(stage1).some((s) => s.id === 'body')).toBe(false);
      expect(reduceTour(at('morning'), 'next', stage1)).toEqual(at('night'));
      expect(reduceTour(at('night'), 'back', stage1)).toEqual(at('morning'));
      expect(progress(at('night'), stage1)).toEqual({ index: 4, total: 6 });
    });

    it('sem cartão da jornada, o Glow é o último passo', () => {
      expect(reduceTour(at('glow'), 'next', stage1)).toEqual(at('journey'));
      expect(reduceTour(at('glow'), 'next', { journeyCard: false }).status).toBe('done');
    });

    it('passo gravado que deixou de se ver: Continuar passa à frente', () => {
      expect(reduceTour(at('body'), 'next', stage1)).toEqual(at('night'));
    });

    it('o percurso da etapa 1 termina em done', () => {
      let s = startTour();
      for (const step of visibleSteps(stage1)) s = reduceTour(s, step.advanceOn, stage1);
      expect(s.status).toBe('done');
    });
  });

  it('isOnStepRoute: lições do Grimório (não o quiz) e rotas exactas', () => {
    const lesson = { id: 'x', route: 'lesson', target: null, advanceOn: 'next' } as const;
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
    expect(tourStateFromDb({ tourStep: 'night', tourPausedAt: null, tourCompletedAt: null })).toEqual(at('night'));
    expect(tourStateFromDb({ tourStep: 'night', tourPausedAt: d, tourCompletedAt: null })).toEqual(at('night', 'paused'));
    expect(tourStateFromDb({ tourStep: null, tourPausedAt: null, tourCompletedAt: d })).toEqual({ stepId: null, status: 'done' });
    expect(tourStateFromDb({ tourStep: null, tourPausedAt: null, tourCompletedAt: null })).toEqual(IDLE_TOUR);
    expect(tourStateFromDb({ tourStep: 'antigo', tourPausedAt: null, tourCompletedAt: null })).toEqual(IDLE_TOUR);
    // Passos retirados (dentro da lição): quem lá estava já tinha aberto a primeira lição.
    expect(tourStateFromDb({ tourStep: 'in-lesson', tourPausedAt: null, tourCompletedAt: null })).toEqual({ stepId: null, status: 'done' });
    // v2: quem estava num passo retirado (Semana, Grimório, campos do diário) conta como concluído.
    for (const old of ['week', 'grimoire-tab', 'first-lesson', 'intention', 'sky']) {
      expect(tourStateFromDb({ tourStep: old, tourPausedAt: null, tourCompletedAt: null })).toEqual({ stepId: null, status: 'done' });
    }
  });
});
