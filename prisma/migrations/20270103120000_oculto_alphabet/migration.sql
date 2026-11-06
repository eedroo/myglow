-- Grimório Oculto, Fase IV: crença sorteada da semana e Alfabeto do Desejo.
ALTER TABLE "OcultoProgress" ADD COLUMN "belief" INTEGER;

CREATE TABLE "OcultoGlyph" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meaning" TEXT,
    "strokes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcultoGlyph_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OcultoGlyph_userId_createdAt_idx" ON "OcultoGlyph"("userId", "createdAt");

ALTER TABLE "OcultoGlyph" ADD CONSTRAINT "OcultoGlyph_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
