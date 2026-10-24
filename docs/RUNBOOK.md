# MYGLOW — Runbook de operação

Procedimentos para quando algo corre mal. Mantém este ficheiro curto e actualizado.

## Onde estão os segredos

| Segredo | Onde vive | Para quê |
|---|---|---|
| `DATABASE_URL`, chaves de IA, VAPID, Resend, Inngest, Upstash | Vercel → Project → Settings → Environment Variables | a app em produção |
| `ADMIN_EMAILS` | Vercel | quem entra em `/admin` |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Vercel | erros no Sentry (UE); o token só serve para enviar source maps no build |
| `BACKUP_DATABASE_URL` | GitHub → Settings → Secrets and variables → Actions | ligação **directa** (sem `-pooler`) à base de produção, só para o `pg_dump` |
| `BACKUP_PASSPHRASE` | GitHub (segredo) **e** o teu gestor de passwords | encripta as cópias. Sem ela as cópias não se abrem |
| `RESTORE_TEST_DATABASE_URL` | GitHub (segredo) | ramo `restore-test` no Neon, onde o teste mensal repõe a cópia |

Nunca colar segredos em issues, commits, conversas ou capturas de ecrã.

## Cópias de segurança

- **Neon (história):** o Neon guarda a história da base durante a janela do plano (ver *history retention* no painel). É a forma mais rápida de voltar atrás algumas horas ou dias.
- **GitHub (diária):** o workflow `backup` corre todos os dias às 03:17 UTC: `pg_dump` (formato custom) encriptado com AES-256 (`gpg`) dentro do contentor, sem nunca ficar em claro no disco. Fica como artefacto `myglow-AAAA-MM-DD.dump.gpg` durante 30 dias. Se falhar, o GitHub envia um email ao dono do repositório.
- **Teste de reposição (mensal):** o workflow `restore-test` corre no dia 1 de cada mês (e à mão): repõe a cópia mais recente no ramo `restore-test` e escreve no resumo as contagens de `User`, `DailyEntry`, `XpEvent` e `Feedback`. Falha se `User` ficar vazio. Aborta se a URL de teste for igual à de produção.

## Repor a base

### 1. Pela história do Neon (perdas recentes, dentro da janela do plano)

1. Neon → projecto → **Branches** → **Create branch**.
2. Escolhe **Past data / Point in time** e o momento antes do problema.
3. Liga-te ao ramo novo e confirma os dados (por exemplo, `SELECT count(*) FROM "User";`).
4. Para pôr em produção: ou tornas o ramo novo o principal (**Set as primary/default**) e actualizas `DATABASE_URL` no Vercel se a ligação mudar, ou copias só as tabelas afectadas do ramo para a base principal.
5. Redeploy no Vercel para garantir que a app usa a ligação certa.

### 2. A partir da cópia do GitHub (fora da janela do Neon, ou Neon indisponível)

1. GitHub → **Actions** → `backup` → a execução do dia certo → descarrega o artefacto `myglow-AAAA-MM-DD.dump.gpg`.
2. Numa máquina com Postgres (mesma versão ou superior à do Neon) e `gpg`:
   ```sh
   gpg --decrypt myglow-AAAA-MM-DD.dump.gpg > myglow.dump   # pede a BACKUP_PASSPHRASE
   ```
3. Cria uma base vazia de destino (no Neon: um ramo ou projecto novo) e repõe:
   ```sh
   pg_restore --clean --if-exists --no-owner --no-privileges --dbname "postgres://…destino…" myglow.dump
   ```
   Avisos sobre extensões ou papéis do Neon podem aparecer; o que importa são os dados.
4. Confirma as contagens (`User`, `DailyEntry`, `XpEvent`, `Feedback`) e só depois aponta `DATABASE_URL` para lá e faz Redeploy.
5. Apaga o `myglow.dump` desencriptado do disco quando acabares.

## Rodar a passphrase das cópias

1. Gera uma frase nova e longa e guarda-a no gestor de passwords, **sem apagar a antiga** (as cópias dos últimos 30 dias continuam encriptadas com ela).
2. GitHub → Secrets → actualiza `BACKUP_PASSPHRASE`.
3. Corre `backup` à mão e depois `restore-test` à mão: ambos têm de ficar verdes.
4. Ao fim de 30 dias (quando já não houver artefactos antigos) podes descartar a frase antiga.

## Quando o Sentry alerta

1. Abre o erro no Sentry: vê a rota ou o `job` (tag das funções Inngest), quantas pessoas e desde quando.
2. Os eventos não têm email, nome, cookies nem texto do diário; só o `id` interno. Para ver a conta, procura o id em `/admin/users` (a ficha não mostra o diário).
3. Se for de uma função Inngest, confirma no painel do Inngest a execução falhada e se os retries esgotaram.
4. Corrige, faz deploy e marca o erro como resolvido no Sentry (volta a abrir sozinho se repetir).

## Monitorização

- `GET /api/health` responde `200 { "ok": true }` quando a base responde em menos de 3 s; senão `503`. Ligado a um serviço externo (UptimeRobot ou Better Stack) a cada 5 minutos, com alerta por email.
- Se o health falhar: ver o estado do Neon e do Vercel, depois os logs da função no Vercel.
