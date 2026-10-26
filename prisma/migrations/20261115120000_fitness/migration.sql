-- CreateEnum
CREATE TYPE "ExerciseSource" AS ENUM ('LIBRARY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ExerciseMeasure" AS ENUM ('REPS_WEIGHT', 'REPS', 'DURATION');

-- CreateEnum
CREATE TYPE "ProgramKind" AS ENUM ('STRENGTH', 'STRETCH', 'MIXED');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'REST_DONE';

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "source" "ExerciseSource" NOT NULL,
    "ownerId" TEXT,
    "names" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "measure" "ExerciseMeasure" NOT NULL,
    "primaryMuscles" TEXT[],
    "secondaryMuscles" TEXT[],
    "equipment" TEXT,
    "level" TEXT,
    "instructions" JSONB,
    "images" TEXT[],
    "defaultRestSec" INTEGER,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitnessPrefs" (
    "userId" TEXT NOT NULL,
    "defaultRestSec" INTEGER NOT NULL DEFAULT 90,
    "restAlert" BOOLEAN NOT NULL DEFAULT true,
    "keepAwake" BOOLEAN NOT NULL DEFAULT true,
    "onboardedAt" TIMESTAMP(3),

    CONSTRAINT "FitnessPrefs_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "FitnessProgram" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "ProgramKind" NOT NULL DEFAULT 'STRENGTH',
    "order" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FitnessProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitnessWorkout" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "FitnessWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutItem" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "targetSets" INTEGER,
    "targetRepsMin" INTEGER,
    "targetRepsMax" INTEGER,
    "targetSec" INTEGER,
    "restSec" INTEGER,
    "notes" TEXT,

    CONSTRAINT "WorkoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FitnessSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workoutId" TEXT,
    "date" DATE NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "restEndsAt" TIMESTAMP(3),
    "restExerciseId" TEXT,
    "clientHidden" BOOLEAN NOT NULL DEFAULT false,
    "extraExercises" TEXT[],
    "notes" TEXT,

    CONSTRAINT "FitnessSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSet" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "reps" INTEGER,
    "weightGrams" INTEGER,
    "durationSec" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "restSec" INTEGER,

    CONSTRAINT "SessionSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exercise_ownerId_idx" ON "Exercise"("ownerId");

-- CreateIndex
CREATE INDEX "FitnessProgram_userId_idx" ON "FitnessProgram"("userId");

-- CreateIndex
CREATE INDEX "FitnessWorkout_userId_idx" ON "FitnessWorkout"("userId");

-- CreateIndex
CREATE INDEX "WorkoutItem_workoutId_idx" ON "WorkoutItem"("workoutId");

-- CreateIndex
CREATE INDEX "FitnessSession_userId_startedAt_idx" ON "FitnessSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "SessionSet_userId_exerciseId_completedAt_idx" ON "SessionSet"("userId", "exerciseId", "completedAt");

-- CreateIndex
CREATE INDEX "SessionSet_sessionId_idx" ON "SessionSet"("sessionId");

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitnessPrefs" ADD CONSTRAINT "FitnessPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitnessProgram" ADD CONSTRAINT "FitnessProgram_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitnessWorkout" ADD CONSTRAINT "FitnessWorkout_programId_fkey" FOREIGN KEY ("programId") REFERENCES "FitnessProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutItem" ADD CONSTRAINT "WorkoutItem_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "FitnessWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutItem" ADD CONSTRAINT "WorkoutItem_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitnessSession" ADD CONSTRAINT "FitnessSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FitnessSession" ADD CONSTRAINT "FitnessSession_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "FitnessWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSet" ADD CONSTRAINT "SessionSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "FitnessSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSet" ADD CONSTRAINT "SessionSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

