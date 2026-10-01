-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'GRIMOIRE';
ALTER TYPE "NotificationKind" ADD VALUE 'GRIMOIRE_LAST';

-- AlterTable
ALTER TABLE "NotificationPrefs" ADD COLUMN     "grimoireEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "grimoireTime" TEXT NOT NULL DEFAULT '10:00';

