-- F7: lembretes diários individuais
ALTER TABLE "NotificationPrefs" ADD COLUMN "morningEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "bodyEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "nightEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Horários passam a múltiplos de 15 min: arredondar os existentes para baixo ("HH:MM" → "HH:00|15|30|45")
UPDATE "NotificationPrefs" SET
  "morningTime" = substr("morningTime", 1, 3) || lpad(((substr("morningTime", 4, 2)::int / 15) * 15)::text, 2, '0'),
  "bodyTime"    = substr("bodyTime", 1, 3)    || lpad(((substr("bodyTime", 4, 2)::int / 15) * 15)::text, 2, '0'),
  "nightTime"   = substr("nightTime", 1, 3)   || lpad(((substr("nightTime", 4, 2)::int / 15) * 15)::text, 2, '0');

-- F7: conteúdo do aviso e estado (linhas antigas ficam com texto vazio)
ALTER TABLE "NotificationLog" ADD COLUMN "title" TEXT NOT NULL DEFAULT '',
ADD COLUMN "body" TEXT NOT NULL DEFAULT '',
ADD COLUMN "url" TEXT NOT NULL DEFAULT '/today',
ADD COLUMN "pushed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "readAt" TIMESTAMP(3);
ALTER TABLE "NotificationLog" ALTER COLUMN "title" DROP DEFAULT,
ALTER COLUMN "body" DROP DEFAULT,
ALTER COLUMN "url" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "NotificationLog_userId_sentAt_idx" ON "NotificationLog"("userId", "sentAt");
