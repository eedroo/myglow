-- CreateTable
CREATE TABLE "AnnouncementSeen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementSeen_userId_key_key" ON "AnnouncementSeen"("userId", "key");

-- AddForeignKey
ALTER TABLE "AnnouncementSeen" ADD CONSTRAINT "AnnouncementSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

