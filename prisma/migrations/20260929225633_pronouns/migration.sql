-- CreateEnum
CREATE TYPE "Pronouns" AS ENUM ('FEMININE', 'MASCULINE', 'NEUTRAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pronouns" "Pronouns" NOT NULL DEFAULT 'NEUTRAL';
