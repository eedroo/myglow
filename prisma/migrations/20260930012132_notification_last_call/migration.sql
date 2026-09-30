-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'WEEK_PLAN_LAST';
ALTER TYPE "NotificationKind" ADD VALUE 'WEEK_REFLECTION_LAST';
ALTER TYPE "NotificationKind" ADD VALUE 'MONTH_PLAN_LAST';
ALTER TYPE "NotificationKind" ADD VALUE 'MONTH_REFLECTION_LAST';

-- AlterTable
ALTER TABLE "NotificationPrefs" ADD COLUMN     "lastCall" BOOLEAN NOT NULL DEFAULT true;
