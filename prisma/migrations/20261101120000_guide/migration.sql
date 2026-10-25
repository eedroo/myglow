-- CreateEnum
CREATE TYPE "GuideStatus" AS ENUM ('READY', 'INSUFFICIENT', 'SUPPORT', 'FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "guideConsentAt" TIMESTAMP(3),
ADD COLUMN     "guideConsentVersion" TEXT;

-- CreateTable
CREATE TABLE "GuideReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "RecapKind" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "status" "GuideStatus" NOT NULL,
    "payload" JSONB,
    "model" TEXT,
    "promptVersion" INTEGER NOT NULL DEFAULT 1,
    "inputHash" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "regenerations" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "rating" INTEGER,

    CONSTRAINT "GuideReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuideReport_userId_generatedAt_idx" ON "GuideReport"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "GuideReport_generatedAt_idx" ON "GuideReport"("generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuideReport_userId_kind_periodKey_key" ON "GuideReport"("userId", "kind", "periodKey");

-- AddForeignKey
ALTER TABLE "GuideReport" ADD CONSTRAINT "GuideReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

