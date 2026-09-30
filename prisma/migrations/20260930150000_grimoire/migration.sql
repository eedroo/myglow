-- AlterEnum
ALTER TYPE "XpSource" ADD VALUE 'COURSE_COMPLETE';

-- DropIndex
DROP INDEX "XpEvent_userId_source_periodStart_key";

-- AlterTable
ALTER TABLE "XpEvent" ADD COLUMN     "refId" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseSlug" TEXT NOT NULL,
    "lessonSlug" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedDate" DATE NOT NULL,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseSlug" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quizAttempts" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CourseProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseSlug" TEXT NOT NULL,
    "lessonSlug" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "box" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonProgress_userId_completedDate_idx" ON "LessonProgress"("userId", "completedDate");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_courseSlug_lessonSlug_key" ON "LessonProgress"("userId", "courseSlug", "lessonSlug");

-- CreateIndex
CREATE UNIQUE INDEX "CourseProgress_userId_courseSlug_key" ON "CourseProgress"("userId", "courseSlug");

-- CreateIndex
CREATE INDEX "ReviewItem_userId_dueDate_idx" ON "ReviewItem"("userId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewItem_userId_courseSlug_lessonSlug_questionId_key" ON "ReviewItem"("userId", "courseSlug", "lessonSlug", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "XpEvent_userId_source_periodStart_refId_key" ON "XpEvent"("userId", "source", "periodStart", "refId");

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseProgress" ADD CONSTRAINT "CourseProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

