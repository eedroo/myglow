-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tourCompletedAt" TIMESTAMP(3),
ADD COLUMN     "tourPausedAt" TIMESTAMP(3),
ADD COLUMN     "tourStartedAt" TIMESTAMP(3),
ADD COLUMN     "tourStep" TEXT;

