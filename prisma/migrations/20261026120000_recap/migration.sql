-- CreateEnum
CREATE TYPE "RecapKind" AS ENUM ('WEEK', 'MONTH');

-- CreateTable
CREATE TABLE "RecapView" (
    "userId" TEXT NOT NULL,
    "kind" "RecapKind" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RecapView_pkey" PRIMARY KEY ("userId","kind","periodKey")
);

-- CreateIndex
CREATE INDEX "RecapView_firstSeenAt_idx" ON "RecapView"("firstSeenAt");

-- AddForeignKey
ALTER TABLE "RecapView" ADD CONSTRAINT "RecapView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

