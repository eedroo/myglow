-- CreateEnum
CREATE TYPE "GuidedFlow" AS ENUM ('DAY_MORNING', 'DAY_BODY', 'DAY_NIGHT', 'WEEK_PLAN', 'WEEK_CLOSE', 'MONTH_PLAN', 'MONTH_CLOSE', 'YEAR_PLAN', 'YEAR_CLOSE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "guidedAutoOpen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GuidedRun" (
    "userId" TEXT NOT NULL,
    "flow" "GuidedFlow" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GuidedRun_pkey" PRIMARY KEY ("userId","flow","periodKey")
);

-- AddForeignKey
ALTER TABLE "GuidedRun" ADD CONSTRAINT "GuidedRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

