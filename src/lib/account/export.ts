import type {
  BirthProfile, CourseProgress, DailyEntry, Exercise, FitnessPrefs, FitnessProgram, FitnessSession, FitnessWorkout, GuideReport, LessonProgress, Month, NotificationLog, NotificationPrefs,
  ProjectIntention, RecapView, SessionSet, User, UserActiveDay, UserAiContent, Week, WeekDayNote, WorkoutItem, XpEvent, Year,
} from '@prisma/client';
import { fromDbDate } from '@/lib/dates';

/**
 * Exportação de dados (RGPD, portabilidade): JSON `myglow-export-v1`. Puro.
 * Lista explícita de campos — segredos (hash da palavra-passe, tokens, chaves de push, sessionVersion)
 * nunca entram. Datas de calendário em `YYYY-MM-DD`; instantes em ISO 8601.
 */
export const EXPORT_FORMAT = 'myglow-export-v1';

export interface ExportSource {
  user: Pick<
    User,
    | 'name' | 'email' | 'locale' | 'theme' | 'timezone' | 'hemisphere' | 'sleepGoalMinutes' | 'pronouns' | 'xpTotal'
    | 'bestMagicStreak' | 'emailVerifiedAt' | 'termsAcceptedAt' | 'termsVersion' | 'privacyVersion' | 'wellbeingConsentAt'
    | 'createdAt' | 'onboardedAt' | 'plan' | 'planSince' | 'planExpiresAt' | 'premiumInterestAt'
    | 'guideConsentAt' | 'guideConsentVersion' | 'friendCode' | 'handle' | 'showBigThree'
  >;
  birthProfile: BirthProfile | null;
  dailyEntries: DailyEntry[];
  weeks: (Week & { dayNotes: WeekDayNote[] })[];
  months: Month[];
  years: Year[];
  projectIntentions: ProjectIntention[];
  xpEvents: XpEvent[];
  lessonProgress: LessonProgress[];
  courseProgress: CourseProgress[];
  notificationPrefs: NotificationPrefs | null;
  notificationLog: NotificationLog[];
  aiContent: UserAiContent[];
  /** F12: dias em que a pessoa abriu a app. */
  activeDays: UserActiveDay[];
  /** F13: retrospectivas vistas (e concluídas). */
  recapViews: RecapView[];
  /** F14: leituras do Guia. */
  guideReports: GuideReport[];
  /** F15: amigos (id, nome, desde), pedidos (só o nome do outro) e bloqueios. */
  friends: { id: string; name: string; since: Date }[];
  friendRequests: { direction: 'sent' | 'received'; otherName: string; status: string; createdAt: Date; respondedAt: Date | null }[];
  blocks: { name: string; createdAt: Date }[];
  /** F16: Foco no corpo (preferências, programas, treinos, sessões com séries, exercícios próprios). */
  fitness: {
    prefs: FitnessPrefs | null;
    programs: (FitnessProgram & { workouts: (FitnessWorkout & { items: WorkoutItem[] })[] })[];
    sessions: (FitnessSession & { sets: SessionSet[] })[];
    customExercises: Exercise[];
  };
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const day = (d: Date) => fromDbDate(d);

export function buildExport(data: ExportSource, now: Date = new Date()) {
  const u = data.user;
  const b = data.birthProfile;
  const p = data.notificationPrefs;
  return {
    exportedAt: now.toISOString(),
    format: EXPORT_FORMAT,
    user: {
      name: u.name,
      email: u.email,
      locale: u.locale,
      theme: u.theme,
      timezone: u.timezone,
      hemisphere: u.hemisphere,
      pronouns: u.pronouns,
      sleepGoalMinutes: u.sleepGoalMinutes,
      emailVerifiedAt: iso(u.emailVerifiedAt),
      termsAcceptedAt: iso(u.termsAcceptedAt),
      termsVersion: u.termsVersion,
      privacyVersion: u.privacyVersion,
      wellbeingConsentAt: iso(u.wellbeingConsentAt),
      onboardedAt: iso(u.onboardedAt),
      createdAt: iso(u.createdAt),
      plan: u.plan,
      planSince: iso(u.planSince),
      planExpiresAt: iso(u.planExpiresAt),
      premiumInterestAt: iso(u.premiumInterestAt),
      guideConsentAt: iso(u.guideConsentAt),
      guideConsentVersion: u.guideConsentVersion,
      friendCode: u.friendCode,
      handle: u.handle,
      showBigThree: u.showBigThree,
    },
    activeDays: data.activeDays.map((a) => day(a.day)),
    recapViews: data.recapViews.map((r) => ({
      kind: r.kind,
      periodKey: r.periodKey,
      firstSeenAt: iso(r.firstSeenAt),
      completedAt: iso(r.completedAt),
    })),
    friends: data.friends.map((f) => ({ id: f.id, name: f.name, since: iso(f.since) })),
    friendRequests: data.friendRequests.map((r) => ({
      direction: r.direction,
      otherName: r.otherName,
      status: r.status,
      createdAt: iso(r.createdAt),
      respondedAt: iso(r.respondedAt),
    })),
    blocks: data.blocks.map((b) => ({ name: b.name, createdAt: iso(b.createdAt) })),
    fitness: {
      prefs: data.fitness.prefs && {
        defaultRestSec: data.fitness.prefs.defaultRestSec,
        restAlert: data.fitness.prefs.restAlert,
        keepAwake: data.fitness.prefs.keepAwake,
        onboardedAt: iso(data.fitness.prefs.onboardedAt),
      },
      customExercises: data.fitness.customExercises.map((e) => ({
        id: e.id,
        names: e.names,
        category: e.category,
        measure: e.measure,
        primaryMuscles: e.primaryMuscles,
        secondaryMuscles: e.secondaryMuscles,
        equipment: e.equipment,
        defaultRestSec: e.defaultRestSec,
        archivedAt: iso(e.archivedAt),
      })),
      programs: data.fitness.programs.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        kind: p.kind,
        order: p.order,
        createdAt: iso(p.createdAt),
        archivedAt: iso(p.archivedAt),
        workouts: p.workouts.map((w) => ({
          id: w.id,
          name: w.name,
          notes: w.notes,
          order: w.order,
          archivedAt: iso(w.archivedAt),
          items: w.items.map((i) => ({
            exerciseId: i.exerciseId,
            order: i.order,
            targetSets: i.targetSets,
            targetRepsMin: i.targetRepsMin,
            targetRepsMax: i.targetRepsMax,
            targetSec: i.targetSec,
            restSec: i.restSec,
            notes: i.notes,
          })),
        })),
      })),
      sessions: data.fitness.sessions.map((x) => ({
        id: x.id,
        workoutId: x.workoutId,
        date: day(x.date),
        startedAt: iso(x.startedAt),
        endedAt: iso(x.endedAt),
        notes: x.notes,
        sets: x.sets.map((t) => ({
          exerciseId: t.exerciseId,
          order: t.order,
          reps: t.reps,
          weightGrams: t.weightGrams,
          weightKg: t.weightGrams === null ? null : Math.round(t.weightGrams / 10) / 100,
          durationSec: t.durationSec,
          restSec: t.restSec,
          completedAt: iso(t.completedAt),
        })),
      })),
    },
    guideReports: data.guideReports.map((g) => ({
      kind: g.kind,
      periodKey: g.periodKey,
      locale: g.locale,
      status: g.status,
      report: g.payload,
      generatedAt: iso(g.generatedAt),
      readAt: iso(g.readAt),
      rating: g.rating,
    })),
    birthProfile: b && {
      birthDate: day(b.birthDate),
      birthTime: b.birthTime,
      birthTimeKnown: b.birthTimeKnown,
      placeName: b.placeName,
      latitude: b.latitude,
      longitude: b.longitude,
      timezone: b.timezone,
      birthUtc: iso(b.birthUtc),
      natalChart: b.natalChart,
    },
    dailyEntries: data.dailyEntries.map((e) => ({
      date: day(e.date),
      moonPhase: e.moonPhase,
      moonSign: e.moonSign,
      intention: e.intention,
      morningBanishName: e.morningBanishName,
      morningBanishDone: e.morningBanishDone,
      morningRitualDone: e.morningRitualDone,
      sleepGoalMet: e.sleepGoalMet,
      wakeMood: e.wakeMood,
      wakeNote: e.wakeNote,
      stretchDone: e.stretchDone,
      workoutDone: e.workoutDone,
      waterDone: e.waterDone,
      nightBanishName: e.nightBanishName,
      nightBanishDone: e.nightBanishDone,
      nightRitualDone: e.nightRitualDone,
      gratitude: e.gratitude,
      mood: e.mood,
      reflection: e.reflection,
      summary: e.summary,
    })),
    weeks: data.weeks.map((w) => ({
      startDate: day(w.startDate),
      title: w.title,
      intention: w.intention,
      weightGrams: w.weightGrams,
      weightKg: w.weightGrams === null ? null : Math.round(w.weightGrams / 10) / 100,
      reflection: w.reflection,
      dayNotes: w.dayNotes.map((n) => ({ date: day(n.date), text: n.text })),
    })),
    months: data.months.map((m) => ({ year: m.year, month: m.month, intention: m.intention, reflection: m.reflection })),
    years: data.years.map((y) => ({ year: y.year, word: y.word, intention: y.intention, reflection: y.reflection })),
    projectIntentions: data.projectIntentions.map((pi) => ({
      period: pi.period,
      periodStart: day(pi.periodStart),
      area: pi.area,
      text: pi.text,
    })),
    xpEvents: data.xpEvents.map((x) => ({
      source: x.source,
      periodStart: day(x.periodStart),
      points: x.points,
      ref: x.refId || null,
      createdAt: iso(x.createdAt),
    })),
    glow: { total: u.xpTotal, bestMagicStreak: u.bestMagicStreak },
    grimoire: {
      lessonProgress: data.lessonProgress.map((l) => ({
        course: l.courseSlug,
        lesson: l.lessonSlug,
        completedAt: iso(l.completedAt),
        completedDate: day(l.completedDate),
      })),
      courseProgress: data.courseProgress.map((c) => ({
        course: c.courseSlug,
        startedAt: iso(c.startedAt),
        quizAttempts: c.quizAttempts,
        bestScore: c.bestScore,
        completedAt: iso(c.completedAt),
      })),
    },
    notificationPrefs: p && {
      enabled: p.enabled,
      morningEnabled: p.morningEnabled,
      morningTime: p.morningTime,
      bodyEnabled: p.bodyEnabled,
      bodyTime: p.bodyTime,
      nightEnabled: p.nightEnabled,
      nightTime: p.nightTime,
      grimoireEnabled: p.grimoireEnabled,
      grimoireTime: p.grimoireTime,
      weekStart: p.weekStart,
      weekEnd: p.weekEnd,
      monthStart: p.monthStart,
      monthEnd: p.monthEnd,
      lastCall: p.lastCall,
    },
    notificationLog: data.notificationLog.map((n) => ({
      kind: n.kind,
      period: n.periodKey,
      title: n.title,
      body: n.body,
      sentAt: iso(n.sentAt),
      readAt: iso(n.readAt),
    })),
    aiContent: data.aiContent.map((a) => ({
      kind: a.kind,
      periodStart: day(a.periodStart),
      locale: a.locale,
      content: a.payload,
      createdAt: iso(a.createdAt),
    })),
  };
}

export type MyglowExport = ReturnType<typeof buildExport>;
