import { describe, expect, it } from 'vitest';
import { toDbDate } from '@/lib/dates';
import { buildExport, type ExportSource } from './export';

const at = new Date('2026-10-02T10:00:00Z');

/** Registos completos, como vêm do Prisma (incluindo campos secretos que a exportação tem de ignorar). */
const source = {
  user: {
    id: 'u1', name: 'Ana', email: 'ana@example.com', passwordHash: '$2b$12$SEGREDO_HASH', sessionVersion: 3,
    locale: 'PT_PT', theme: 'DARK', timezone: 'Europe/Lisbon', hemisphere: 'NORTH', sleepGoalMinutes: 450, pronouns: 'FEMININE',
    xpTotal: 320, bestMagicStreak: 6, emailVerifiedAt: at, termsAcceptedAt: at, termsVersion: '2026-10', privacyVersion: '2026-10',
    wellbeingConsentAt: at, createdAt: at, onboardedAt: at,
    authTokens: [{ tokenHash: 'SEGREDO_TOKEN_HASH' }],
  },
  birthProfile: {
    id: 'b1', userId: 'u1', birthDate: toDbDate('1990-07-15'), birthTime: '14:30', birthTimeKnown: true, placeName: 'Lisboa',
    latitude: 38.7, longitude: -9.1, timezone: 'Europe/Lisbon', birthUtc: at, natalChart: { sun: 'CANCER' }, chartComputedAt: at,
    createdAt: at, updatedAt: at,
  },
  dailyEntries: [{
    id: 'd1', userId: 'u1', date: toDbDate('2026-10-01'), moonPhase: 'FULL_MOON', moonSign: 'ARIES', intention: 'Calma',
    morningBanishName: null, morningBanishDone: true, morningRitualDone: true, sleepGoalMet: true, wakeMood: 4, wakeNote: null,
    stretchDone: true, workoutDone: false, waterDone: true, nightBanishName: null, nightBanishDone: false, nightRitualDone: false,
    gratitude: 'Sol', mood: 5, reflection: null, summary: null, createdAt: at, updatedAt: at,
  }],
  weeks: [{
    id: 'w1', userId: 'u1', startDate: toDbDate('2026-09-27'), year: 2026, month: 9, weekOfMonth: 5, title: 'Raízes',
    intention: null, weightGrams: 61250, reflection: null, createdAt: at, updatedAt: at,
    dayNotes: [{ id: 'n1', weekId: 'w1', date: toDbDate('2026-09-28'), text: 'Nota' }],
  }],
  months: [{ id: 'm1', userId: 'u1', year: 2026, month: 10, intention: 'Foco', reflection: null, createdAt: at, updatedAt: at }],
  years: [{ id: 'y1', userId: 'u1', year: 2026, word: 'Luz', intention: null, reflection: null, createdAt: at, updatedAt: at }],
  projectIntentions: [{ id: 'p1', userId: 'u1', period: 'WEEK', periodStart: toDbDate('2026-09-27'), area: 'MAGIC', text: 'Meta', updatedAt: at }],
  xpEvents: [{ id: 'x1', userId: 'u1', source: 'DAY_COMPLETE', periodStart: toDbDate('2026-10-01'), points: 10, refId: '', createdAt: at }],
  lessonProgress: [{ id: 'l1', userId: 'u1', courseSlug: 'vida-magica', lessonSlug: 'intencao', completedAt: at, completedDate: toDbDate('2026-10-01') }],
  courseProgress: [{ id: 'c1', userId: 'u1', courseSlug: 'vida-magica', startedAt: at, quizAttempts: 1, bestScore: 5, completedAt: at }],
  notificationPrefs: {
    id: 'np', userId: 'u1', enabled: true, morningTime: '08:00', bodyTime: '13:00', nightTime: '21:30', weekStart: true, weekEnd: true,
    monthStart: true, monthEnd: true, morningEnabled: true, bodyEnabled: true, nightEnabled: true, lastCall: true,
    grimoireEnabled: true, grimoireTime: '10:00',
  },
  notificationLog: [{
    id: 'nl', userId: 'u1', kind: 'MORNING', periodKey: '2026-10-01', sentAt: at, title: 'Bom dia', body: 'Intenção?', url: '/today', pushed: true, readAt: null,
  }],
  aiContent: [{
    id: 'ai', userId: 'u1', kind: 'DAY_PERSONAL', periodStart: toDbDate('2026-10-01'), locale: 'PT_PT', payload: { headline: 'Olá' },
    model: 'm', promptVersion: 1, createdAt: at,
  }],
  // Não faz parte da origem, mas se alguém o passar por engano não pode aparecer.
  pushSubscriptions: [{ endpoint: 'https://push.example.com/SEGREDO', p256dh: 'SEGREDO_P256DH', auth: 'SEGREDO_AUTH' }],
} as unknown as ExportSource;

describe('buildExport', () => {
  const out = buildExport(source, at);
  const json = JSON.stringify(out);

  it('formato e todas as secções', () => {
    expect(out.format).toBe('myglow-export-v1');
    for (const key of [
      'exportedAt', 'user', 'birthProfile', 'dailyEntries', 'weeks', 'months', 'years', 'projectIntentions', 'xpEvents',
      'glow', 'grimoire', 'notificationPrefs', 'notificationLog', 'aiContent',
    ]) expect(out, key).toHaveProperty(key);
    expect(out.grimoire.lessonProgress).toHaveLength(1);
    expect(out.grimoire.courseProgress[0]).toMatchObject({ course: 'vida-magica', bestScore: 5 });
    expect(out.glow).toEqual({ total: 320, bestMagicStreak: 6 });
    expect(out.aiContent[0]!.content).toEqual({ headline: 'Olá' });
  });

  it('sem segredos', () => {
    for (const s of ['passwordHash', 'SEGREDO', 'p256dh', 'endpoint', 'tokenHash', 'sessionVersion']) expect(json, s).not.toContain(s);
  });

  it('datas de calendário em YYYY-MM-DD e peso em kg', () => {
    expect(out.dailyEntries[0]!.date).toBe('2026-10-01');
    expect(out.birthProfile!.birthDate).toBe('1990-07-15');
    expect(out.weeks[0]).toMatchObject({ startDate: '2026-09-27', weightGrams: 61250, weightKg: 61.25 });
    expect(out.weeks[0]!.dayNotes[0]).toEqual({ date: '2026-09-28', text: 'Nota' });
  });
});
