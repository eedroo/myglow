-- Grimório Oculto, Fase V: paradigma pessoal.
CREATE TABLE "OcultoParadigm" (
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "premises" TEXT,
    "symbols" TEXT[],
    "practices" TEXT,
    "limits" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcultoParadigm_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "OcultoParadigm" ADD CONSTRAINT "OcultoParadigm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
