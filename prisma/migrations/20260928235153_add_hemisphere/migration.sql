-- CreateEnum
CREATE TYPE "Hemisphere" AS ENUM ('NORTH', 'SOUTH');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hemisphere" "Hemisphere" NOT NULL DEFAULT 'NORTH';
