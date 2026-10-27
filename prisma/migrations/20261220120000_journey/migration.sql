-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'JOURNEY_UNLOCK';
ALTER TYPE "NotificationKind" ADD VALUE 'ANNOUNCEMENT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "announcementSeen" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "journeyAllUnlockedAt" TIMESTAMP(3),
ADD COLUMN     "journeyMappedAt" TIMESTAMP(3),
ADD COLUMN     "journeyStage" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "JourneyUnlock" (
    "userId" TEXT NOT NULL,
    "unlockId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ceremonySeenAt" TIMESTAMP(3),
    "ceremonyDismissed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "JourneyUnlock_pkey" PRIMARY KEY ("userId","unlockId")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "key" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "JourneyUnlock" ADD CONSTRAINT "JourneyUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- F19: utilizadores actuais ficam na etapa que o histórico indica, sem perder nada do que já usavam
-- (as mesmas regras de mapExistingUser em src/lib/journey/map.ts). Os desbloqueios ficam com a mini-lição
-- já vista; journeyMappedAt marca quem recebe o anúncio v2.
CREATE TEMP TABLE "_journey_map" AS
SELECT u."id",
  CASE
    WHEN EXISTS (SELECT 1 FROM "DailyEntry" d WHERE d."userId" = u."id"
      AND (btrim(coalesce(d."reflection", '')) <> '' OR btrim(coalesce(d."summary", '')) <> '')) THEN 5
    WHEN EXISTS (SELECT 1 FROM "DailyEntry" d WHERE d."userId" = u."id"
      AND (d."stretchDone" OR d."workoutDone" OR d."waterDone")) THEN 4
    WHEN EXISTS (SELECT 1 FROM "DailyEntry" d WHERE d."userId" = u."id"
      AND (d."morningRitualDone" OR d."nightRitualDone" OR d."sleepGoalMet" OR d."wakeMood" IS NOT NULL
        OR btrim(coalesce(d."wakeNote", '')) <> ''))
      OR EXISTS (SELECT 1 FROM "ProjectIntention" p WHERE p."userId" = u."id" AND p."period" = 'WEEK') THEN 3
    WHEN EXISTS (SELECT 1 FROM "DailyEntry" d WHERE d."userId" = u."id"
      AND (d."morningBanishDone" OR d."nightBanishDone"
        OR btrim(coalesce(d."morningBanishName", '')) <> '' OR btrim(coalesce(d."nightBanishName", '')) <> '')) THEN 2
    ELSE 1
  END AS "stage",
  (EXISTS (SELECT 1 FROM "Week" w WHERE w."userId" = u."id" AND btrim(coalesce(w."reflection", '')) <> '')
    OR EXISTS (SELECT 1 FROM "Month" m WHERE m."userId" = u."id"
      AND (btrim(coalesce(m."intention", '')) <> '' OR btrim(coalesce(m."reflection", '')) <> ''))
    OR EXISTS (SELECT 1 FROM "Year" y WHERE y."userId" = u."id"
      AND (btrim(coalesce(y."word", '')) <> '' OR btrim(coalesce(y."intention", '')) <> '' OR btrim(coalesce(y."reflection", '')) <> ''))
    OR EXISTS (SELECT 1 FROM "ProjectIntention" p WHERE p."userId" = u."id" AND p."period" IN ('MONTH', 'YEAR'))) AS "monthYear"
FROM "User" u;

UPDATE "User" u SET "journeyStage" = m."stage", "journeyMappedAt" = CURRENT_TIMESTAMP
FROM "_journey_map" m WHERE u."id" = m."id";

INSERT INTO "JourneyUnlock" ("userId", "unlockId", "unlockedAt", "ceremonySeenAt")
SELECT m."id", 'stage-' || g, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "_journey_map" m, generate_series(2, m."stage") AS g
ON CONFLICT DO NOTHING;

INSERT INTO "JourneyUnlock" ("userId", "unlockId", "unlockedAt", "ceremonySeenAt")
SELECT m."id", 'month-year', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "_journey_map" m WHERE m."monthYear" OR m."stage" >= 3
ON CONFLICT DO NOTHING;

DROP TABLE "_journey_map";
