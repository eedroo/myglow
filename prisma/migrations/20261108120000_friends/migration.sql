-- F15: código de amigo aleatório (8 caracteres, alfabeto sem 0/O/1/I). É o valor por defeito da coluna,
-- por isso a coluna nova preenche também as contas existentes (uma chamada por linha).
CREATE OR REPLACE FUNCTION mg_friend_code() RETURNS TEXT AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(alphabet, 1 + floor(random() * 32)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- CreateEnum
CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'FRIEND_REQUEST';
ALTER TYPE "NotificationKind" ADD VALUE 'FRIEND_ACCEPTED';

-- AlterTable
ALTER TABLE "NotificationPrefs" ADD COLUMN     "friends" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "friendCode" TEXT NOT NULL DEFAULT mg_friend_code(),
ADD COLUMN     "handle" TEXT,
ADD COLUMN     "invitedById" TEXT,
ADD COLUMN     "showBigThree" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("userAId","userBId")
);

-- CreateTable
CREATE TABLE "UserBlock" (
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateIndex
CREATE INDEX "FriendRequest_toId_status_idx" ON "FriendRequest"("toId", "status");

-- CreateIndex
CREATE INDEX "FriendRequest_status_createdAt_idx" ON "FriendRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_fromId_toId_key" ON "FriendRequest"("fromId", "toId");

-- CreateIndex
CREATE INDEX "Friendship_userBId_idx" ON "Friendship"("userBId");

-- CreateIndex
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "User_friendCode_key" ON "User"("friendCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

