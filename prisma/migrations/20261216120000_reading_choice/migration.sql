-- CreateEnum
CREATE TYPE "ReadingChoice" AS ENUM ('NOW', 'NIGHT');

-- AlterTable
ALTER TABLE "DailyEntry" ADD COLUMN     "readingChoice" "ReadingChoice";

