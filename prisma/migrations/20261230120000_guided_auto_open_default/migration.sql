-- Passo a passo ao entrar passa a ser o comportamento normal (manhã na 1.ª abertura do dia, noite à hora do aviso).
ALTER TABLE "User" ALTER COLUMN "guidedAutoOpen" SET DEFAULT true;
UPDATE "User" SET "guidedAutoOpen" = true;
