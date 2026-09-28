-- CreateEnum
CREATE TYPE "ThemePref" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('PT_PT', 'PT_BR', 'EN');

-- CreateEnum
CREATE TYPE "ProjectArea" AS ENUM ('MAGIC', 'PERSONAL', 'LEISURE', 'PROFESSIONAL', 'STUDIES');

-- CreateEnum
CREATE TYPE "PeriodKind" AS ENUM ('WEEK', 'MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "MoonPhase" AS ENUM ('NEW_MOON', 'WAXING_CRESCENT', 'FIRST_QUARTER', 'WAXING_GIBBOUS', 'FULL_MOON', 'WANING_GIBBOUS', 'LAST_QUARTER', 'WANING_CRESCENT');

-- CreateEnum
CREATE TYPE "ZodiacSign" AS ENUM ('ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO', 'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES');

-- CreateEnum
CREATE TYPE "XpSource" AS ENUM ('DAY_MORNING', 'DAY_BODY', 'DAY_NIGHT', 'DAY_COMPLETE', 'WEEK_PLAN', 'WEEK_REFLECTION', 'MONTH_PLAN', 'MONTH_REFLECTION', 'YEAR_PLAN', 'STREAK_BONUS');

-- CreateEnum
CREATE TYPE "SignContentKind" AS ENUM ('DAY_HOROSCOPE', 'WEEK_ENERGY', 'MONTH_ENERGY');

-- CreateEnum
CREATE TYPE "UserContentKind" AS ENUM ('DAY_PERSONAL', 'WEEK_PERSONAL', 'MONTH_PERSONAL', 'MONTH_RITUALS');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('MORNING', 'BODY', 'NIGHT', 'WEEK_START', 'WEEK_END', 'MONTH_START', 'MONTH_END');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'PT_PT',
    "theme" "ThemePref" NOT NULL DEFAULT 'LIGHT',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Lisbon',
    "sleepGoalMinutes" INTEGER NOT NULL DEFAULT 420,
    "xpTotal" INTEGER NOT NULL DEFAULT 0,
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BirthProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "birthTime" TEXT,
    "birthTimeKnown" BOOLEAN NOT NULL,
    "placeName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL,
    "birthUtc" TIMESTAMP(3) NOT NULL,
    "natalChart" JSONB,
    "chartComputedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BirthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "moonPhase" "MoonPhase" NOT NULL,
    "moonSign" "ZodiacSign" NOT NULL,
    "intention" TEXT,
    "morningBanishName" TEXT,
    "morningBanishDone" BOOLEAN NOT NULL DEFAULT false,
    "morningRitualDone" BOOLEAN NOT NULL DEFAULT false,
    "sleepGoalMet" BOOLEAN NOT NULL DEFAULT false,
    "wakeMood" INTEGER,
    "wakeNote" TEXT,
    "stretchDone" BOOLEAN NOT NULL DEFAULT false,
    "workoutDone" BOOLEAN NOT NULL DEFAULT false,
    "waterDone" BOOLEAN NOT NULL DEFAULT false,
    "nightBanishName" TEXT,
    "nightBanishDone" BOOLEAN NOT NULL DEFAULT false,
    "nightRitualDone" BOOLEAN NOT NULL DEFAULT false,
    "gratitude" TEXT,
    "mood" INTEGER,
    "reflection" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Week" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "weekOfMonth" INTEGER NOT NULL,
    "title" TEXT,
    "intention" TEXT,
    "weightGrams" INTEGER,
    "reflection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekDayNote" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "WeekDayNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Month" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "intention" TEXT,
    "reflection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Month_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Year" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "word" TEXT,
    "intention" TEXT,
    "reflection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Year_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectIntention" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" "PeriodKind" NOT NULL,
    "periodStart" DATE NOT NULL,
    "area" "ProjectArea" NOT NULL,
    "text" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectIntention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "XpSource" NOT NULL,
    "periodStart" DATE NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignContent" (
    "id" TEXT NOT NULL,
    "kind" "SignContentKind" NOT NULL,
    "periodStart" DATE NOT NULL,
    "sign" "ZodiacSign" NOT NULL,
    "locale" "Locale" NOT NULL,
    "payload" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAiContent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "UserContentKind" NOT NULL,
    "periodStart" DATE NOT NULL,
    "locale" "Locale" NOT NULL,
    "payload" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAiContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPrefs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "morningTime" TEXT NOT NULL DEFAULT '08:00',
    "bodyTime" TEXT NOT NULL DEFAULT '13:00',
    "nightTime" TEXT NOT NULL DEFAULT '21:30',
    "weekStart" BOOLEAN NOT NULL DEFAULT true,
    "weekEnd" BOOLEAN NOT NULL DEFAULT true,
    "monthStart" BOOLEAN NOT NULL DEFAULT true,
    "monthEnd" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPrefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BirthProfile_userId_key" ON "BirthProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyEntry_userId_date_key" ON "DailyEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Week_userId_startDate_key" ON "Week"("userId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "WeekDayNote_weekId_date_key" ON "WeekDayNote"("weekId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Month_userId_year_month_key" ON "Month"("userId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Year_userId_year_key" ON "Year"("userId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectIntention_userId_period_periodStart_area_key" ON "ProjectIntention"("userId", "period", "periodStart", "area");

-- CreateIndex
CREATE UNIQUE INDEX "XpEvent_userId_source_periodStart_key" ON "XpEvent"("userId", "source", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "SignContent_kind_periodStart_sign_locale_key" ON "SignContent"("kind", "periodStart", "sign", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "UserAiContent_userId_kind_periodStart_locale_key" ON "UserAiContent"("userId", "kind", "periodStart", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPrefs_userId_key" ON "NotificationPrefs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_userId_kind_periodKey_key" ON "NotificationLog"("userId", "kind", "periodKey");

-- AddForeignKey
ALTER TABLE "BirthProfile" ADD CONSTRAINT "BirthProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEntry" ADD CONSTRAINT "DailyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Week" ADD CONSTRAINT "Week_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekDayNote" ADD CONSTRAINT "WeekDayNote_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Month" ADD CONSTRAINT "Month_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Year" ADD CONSTRAINT "Year_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectIntention" ADD CONSTRAINT "ProjectIntention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAiContent" ADD CONSTRAINT "UserAiContent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPrefs" ADD CONSTRAINT "NotificationPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
