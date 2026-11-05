-- CreateTable
CREATE TABLE "OcultoDream" (
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "text" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcultoDream_pkey" PRIMARY KEY ("userId","date")
);

-- AddForeignKey
ALTER TABLE "OcultoDream" ADD CONSTRAINT "OcultoDream_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

