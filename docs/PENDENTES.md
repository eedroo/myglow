# Configurações pendentes (fora do código)

Lembrar o Eduardo no fim das próximas implementações. Passo a passo em `docs/RUNBOOK.md` e na secção 7 do prompt da Fase 12.

- [ ] **Aviso de erros (Sentry):** criar conta na região UE, projecto Next.js; no Vercel preencher `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`; alerta por email para cada erro novo. Opcional: sem DSN a app funciona e o Sentry fica desligado.
- [ ] **Cópias de segurança:** no Neon copiar a ligação directa (sem `-pooler`) e criar o ramo `restore-test`; no GitHub (Settings → Secrets and variables → Actions) criar `BACKUP_DATABASE_URL`, `BACKUP_PASSPHRASE` (guardada no gestor de passwords) e `RESTORE_TEST_DATABASE_URL`; correr `backup` e `restore-test` à mão. Até lá o workflow `backup` falha todos os dias: desactivá-lo em Actions → backup → "…" → Disable workflow, ou configurar.
- [ ] **Monitorização:** UptimeRobot ou Better Stack para `/api/health` a cada 5 minutos.
- [ ] **Vercel Analytics:** Project → Analytics → Enable.
