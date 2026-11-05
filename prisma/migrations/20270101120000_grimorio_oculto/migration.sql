-- CreateEnum
CREATE TYPE "OcultoReviewResult" AS ENUM ('ADVANCE', 'REPEAT');

-- CreateTable
CREATE TABLE "OcultoProgress" (
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL DEFAULT 1,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "weekStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcultoProgress_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "OcultoSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "attempt" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "plannedSec" INTEGER NOT NULL,
    "actualSec" INTEGER NOT NULL,
    "concentration" INTEGER NOT NULL,
    "difficulty" TEXT,
    "notes" TEXT,
    "experience" TEXT,
    "interpretation" TEXT,
    "evidence" TEXT,
    "dream" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcultoSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcultoReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "attempt" INTEGER NOT NULL,
    "result" "OcultoReviewResult" NOT NULL,
    "reasons" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcultoReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OcultoSession_userId_date_idx" ON "OcultoSession"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "OcultoSession_userId_week_attempt_day_key" ON "OcultoSession"("userId", "week", "attempt", "day");

-- CreateIndex
CREATE UNIQUE INDEX "OcultoReview_userId_week_attempt_key" ON "OcultoReview"("userId", "week", "attempt");

-- AddForeignKey
ALTER TABLE "OcultoProgress" ADD CONSTRAINT "OcultoProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcultoSession" ADD CONSTRAINT "OcultoSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcultoReview" ADD CONSTRAINT "OcultoReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

