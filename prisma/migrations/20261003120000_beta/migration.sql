-- CreateEnum
CREATE TYPE "FeedbackKind" AS ENUM ('BUG', 'IDEA', 'PRAISE', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstStepsDismissedAt" TIMESTAMP(3),
ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "welcomeSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" "FeedbackKind" NOT NULL,
    "message" TEXT NOT NULL,
    "path" TEXT,
    "userAgent" TEXT,
    "locale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

