import { describe, expect, it } from 'vitest';
import {
  formatClock,
  autoEndAt, canStartSession, diaryChecksFor, elapsed, prefillSet, remainingRest, restEndsAt, restFor, validateSet,
} from './session';

const t0 = new Date('2026-11-01T10:00:00Z');
const plus = (s: number) => new Date(t0.getTime() + s * 1000);

describe('descanso', () => {
  it('restFor: item → exercício → preferência', () => {
    expect(restFor({ restSec: 120 }, { defaultRestSec: 60 }, { defaultRestSec: 90 })).toBe(120);
    expect(restFor(null, { defaultRestSec: 60 }, { defaultRestSec: 90 })).toBe(60);
    expect(restFor({ restSec: null }, { defaultRestSec: null }, { defaultRestSec: 90 })).toBe(90);
  });

  it('remainingRest a partir de timestamps; depois do fim → 0', () => {
    const end = restEndsAt(t0, 90);
    expect(remainingRest(end, plus(30))).toBe(60);
    expect(remainingRest(end, plus(200))).toBe(0);
    expect(remainingRest(null, t0)).toBe(0);
  });

  it('elapsed com e sem endedAt', () => {
    expect(elapsed(t0, plus(125))).toBe(125);
    expect(elapsed(t0, plus(9999), plus(1800))).toBe(1800);
  });
});

describe('prefillSet', () => {
  const last = { date: '2026-10-25', sets: [{ reps: 10, weightGrams: 60000, durationSec: null }, { reps: 10, weightGrams: 60000, durationSec: null }, { reps: 9, weightGrams: 60000, durationSec: null }] };

  it('2.ª série = a 2.ª da última vez', () => {
    expect(prefillSet({ doneInSession: [{ exerciseId: 'x', reps: 12, weightGrams: 55000 }], last, target: { repsMin: 8, sec: null } })).toEqual({
      reps: 10, weightGrams: 60000,
    });
  });

  it('mais séries do que da última vez: a última feita agora', () => {
    const done = [1, 2, 3].map(() => ({ exerciseId: 'x', reps: 8, weightGrams: 62500 }));
    expect(prefillSet({ doneInSession: done, last, target: { repsMin: 8, sec: null } })).toEqual({ reps: 8, weightGrams: 62500 });
  });

  it('sem histórico: o alvo', () => {
    expect(prefillSet({ doneInSession: [], last: null, target: { repsMin: 8, sec: null } })).toEqual({ reps: 8 });
    expect(prefillSet({ doneInSession: [], last: null, target: { repsMin: null, sec: 30 } })).toEqual({ durationSec: 30 });
  });
});

describe('validateSet', () => {
  it('campos em falta e limites', () => {
    expect(validateSet('REPS_WEIGHT', { exerciseId: 'x', reps: 10 })).toEqual({ ok: false, reason: 'missing-weight' });
    expect(validateSet('REPS_WEIGHT', { exerciseId: 'x', weightGrams: 10000 })).toEqual({ ok: false, reason: 'missing-reps' });
    expect(validateSet('DURATION', { exerciseId: 'x' })).toEqual({ ok: false, reason: 'missing-duration' });
    expect(validateSet('REPS_WEIGHT', { exerciseId: 'x', reps: 5, weightGrams: 600_000 })).toEqual({ ok: false, reason: 'out-of-range' });
    expect(validateSet('REPS', { exerciseId: 'x', reps: 0 })).toEqual({ ok: false, reason: 'out-of-range' });
  });

  it('válidas (peso 0 conta)', () => {
    expect(validateSet('REPS_WEIGHT', { exerciseId: 'x', reps: 10, weightGrams: 0 })).toEqual({ ok: true });
    expect(validateSet('REPS', { exerciseId: 'x', reps: 15 })).toEqual({ ok: true });
    expect(validateSet('DURATION', { exerciseId: 'x', durationSec: 30 })).toEqual({ ok: true });
  });
});

describe('diaryChecksFor', () => {
  it('0 séries → nada', () => {
    expect(diaryChecksFor({ setsCount: 0, programKind: 'STRENGTH', exerciseCategories: ['strength'] })).toEqual({ workoutDone: false, stretchDone: false });
  });

  it('só alongamentos → alongamento; programa STRETCH também', () => {
    expect(diaryChecksFor({ setsCount: 4, programKind: null, exerciseCategories: ['stretching'] })).toEqual({ workoutDone: false, stretchDone: true });
    expect(diaryChecksFor({ setsCount: 4, programKind: 'STRETCH', exerciseCategories: ['strength'] })).toEqual({ workoutDone: false, stretchDone: true });
  });

  it('força + alongamento → os dois; só força → treino', () => {
    expect(diaryChecksFor({ setsCount: 8, programKind: 'MIXED', exerciseCategories: ['strength', 'stretching'] })).toEqual({ workoutDone: true, stretchDone: true });
    expect(diaryChecksFor({ setsCount: 8, programKind: 'STRENGTH', exerciseCategories: ['strength'] })).toEqual({ workoutDone: true, stretchDone: false });
  });
});

describe('sessões', () => {
  it('uma activa de cada vez', () => {
    expect(canStartSession({ id: 's1' })).toBe(false);
    expect(canStartSession(null)).toBe(true);
  });

  it('fim automático depois de 6 h, na última série', () => {
    expect(autoEndAt({ startedAt: t0, lastSetAt: plus(3600), now: plus(5 * 3600) })).toBeNull();
    expect(autoEndAt({ startedAt: t0, lastSetAt: plus(3600), now: plus(7 * 3600) })).toEqual(plus(3600));
  });
});

describe('formatClock', () => {
  it('minutos e horas', () => {
    expect(formatClock(125)).toBe('02:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-3)).toBe('00:00');
  });
});
