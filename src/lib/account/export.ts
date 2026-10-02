import type {
  BirthProfile, CourseProgress, DailyEntry, LessonProgress, Month, NotificationLog, NotificationPrefs,
  ProjectIntention, User, UserAiContent, Week, WeekDayNote, XpEvent, Year,
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
    | 'createdAt' | 'onboardedAt'
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
    },
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
