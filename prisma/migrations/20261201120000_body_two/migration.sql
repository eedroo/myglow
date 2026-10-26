-- CreateEnum
CREATE TYPE "BodyGoalDirection" AS ENUM ('GAIN', 'MAINTAIN', 'LOSE');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'WEIGH_IN';

-- AlterTable
ALTER TABLE "FitnessPrefs" ADD COLUMN     "weighInReminder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weighInTime" TEXT NOT NULL DEFAULT '08:00';

-- AlterTable
ALTER TABLE "SessionSet" ADD COLUMN     "prKinds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "guideIncludeBody" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BodyWeightEntry" (
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "grams" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BodyWeightEntry_pkey" PRIMARY KEY ("userId","date")
);

-- CreateTable
CREATE TABLE "BodyGoal" (
    "userId" TEXT NOT NULL,
    "direction" "BodyGoalDirection" NOT NULL,
    "weeklyRateGrams" INTEGER NOT NULL,
    "targetGrams" INTEGER,
    "startGrams" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodyGoal_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "BodyWeightEntry" ADD CONSTRAINT "BodyWeightEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyGoal" ADD CONSTRAINT "BodyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Recálculo único dos recordes das séries existentes (mesma regra que `recomputePrs` em src/lib/fitness/progress.ts):
-- por pessoa e exercício, por ordem (completedAt, id); a primeira série de um exercício nunca é recorde.
-- weight = peso maior que o máximo anterior; e1rm = Epley (1 a 12 reps, arredondado a 100 g) maior que o anterior;
-- reps = mais reps do que o máximo anterior feito com o mesmo peso ou maior.
WITH s AS (
  SELECT "id", "userId", "exerciseId", "completedAt", "reps", "weightGrams",
         CASE WHEN "reps" BETWEEN 1 AND 12 AND "weightGrams" > 0
              THEN ROUND("weightGrams" * (1 + "reps" / 30.0) / 100) * 100 END AS e1rm
  FROM "SessionSet"
),
k AS (
  SELECT s."id",
    ARRAY_REMOVE(ARRAY[
      CASE WHEN s."weightGrams" > (SELECT MAX(p."weightGrams") FROM s p WHERE p."userId" = s."userId" AND p."exerciseId" = s."exerciseId"
             AND (p."completedAt" < s."completedAt" OR (p."completedAt" = s."completedAt" AND p."id" < s."id"))) THEN 'weight' END,
      CASE WHEN s.e1rm > (SELECT MAX(p.e1rm) FROM s p WHERE p."userId" = s."userId" AND p."exerciseId" = s."exerciseId"
             AND (p."completedAt" < s."completedAt" OR (p."completedAt" = s."completedAt" AND p."id" < s."id"))) THEN 'e1rm' END,
      CASE WHEN s."reps" > (SELECT MAX(p."reps") FROM s p WHERE p."userId" = s."userId" AND p."exerciseId" = s."exerciseId"
             AND (p."completedAt" < s."completedAt" OR (p."completedAt" = s."completedAt" AND p."id" < s."id"))
             AND COALESCE(p."weightGrams", 0) >= COALESCE(s."weightGrams", 0)) THEN 'reps' END
    ], NULL) AS kinds
  FROM s
)
UPDATE "SessionSet" t SET "prKinds" = k.kinds FROM k WHERE k."id" = t."id" AND k.kinds <> '{}';
