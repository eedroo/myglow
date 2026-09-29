-- AlterTable
ALTER TABLE "SignContent" ADD COLUMN     "promptVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiUseIntentions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserAiContent" ADD COLUMN     "promptVersion" INTEGER NOT NULL DEFAULT 1;
