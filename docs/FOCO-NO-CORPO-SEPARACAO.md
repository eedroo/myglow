# Foco no corpo como aplicativo independente

Plano para tirar o Foco no corpo (treinos, sessões, exercícios, peso e meta) do MYGLOW e fazer dele um app próprio,
com repositório e projeto Vercel próprios. Escrito a partir do código do MYGLOW no commit `73f7028`.

## 1. Decisões a tomar antes de começar

| # | Decisão | Opções | Recomendação |
|---|---|---|---|
| 1 | Contas | **A.** Contas próprias no app novo (banco e login separados). **B.** Mesma conta do MYGLOW (mesmo banco ou login único entre domínios). | **A.** O app fica realmente independente. As contas atuais passam por uma migração única pelo e-mail (ver §5). |
| 2 | O que o MYGLOW perde | Hoje, terminar um treino marca "Treino" no diário, o peso aparece na Semana, na Retrospectiva e no Guia, e a manhã passo a passo pede o peso. | Cortar tudo na v1. O Corpo do MYGLOW volta a ser só os 3 checks (alongamento, treino, água), que já existem para todos. Uma ponte por API pode vir depois (§8). |
| 3 | Plano e pagamento | Hoje `body-pro` é premium no MYGLOW (liberado à mão pelo admin). | O app novo começa com o seu próprio interruptor de premium no admin. Quem tem `body-pro` hoje entra como premium. |
| 4 | Nome e domínio | | A definir (ex.: `corpo.myglow.app` ou um domínio próprio). Usado em `APP_URL`, `AUTH_URL`, e-mails e PWA. |

## 2. O que vai para o app novo

### Rotas (App Router)
- `src/app/(body)/**`: `layout.tsx`, `error.tsx` e as páginas `body/`, `body/corpo`, `body/day`, `body/day/[date]`, `body/exercises`, `body/exercises/[id]`, `body/programs/[id]`, `body/session`, `body/sessions`, `body/sessions/[id]`, `body/weight`, `body/welcome`, `body/workouts/[id]`. No app novo passam para a raiz (sem o prefixo `/body`).
- `src/app/api/fitness/sessions/[id]/route.ts` (gravação das séries em segundo plano).

### Lógica, actions e jobs
- `src/lib/fitness/*` (biblioteca, sessões, progresso, PRs, descanso, modelos, tipos, queries, escrita) e `src/lib/body/*` (peso, metas, mapa muscular), com os testes.
- `src/actions/fitness.ts` e `src/actions/body.ts`.
- `src/inngest/functions/fitnessRestAlert.ts` (push "Descanso acabou").
- `prisma/seed-exercises.ts`, `scripts/fitness/import-images.ts`, `scripts/fitness/translate.ts` e `content/exercises/**` (1,2 MB: `source/exercises.json`, `images.json`, `i18n/pt-PT.json`, `i18n/pt-BR.json`).

### Interface
- `src/components/body/*` (50 componentes).
- CSS: `body-bar`, `body-nav`, `body-shell`, `body-welcome`, `calendar`, `compare`, `day-metrics`, `ex-chart`, `ex-detail`, `ex-list`, `ex-picker`, `ex-records`, `muscle-map`, `program`, `rest`, `session-pill`, `session-summary`, `session`, `set-details`, `set-line`, `weight-card`, `weight-chart`, `weight-entry`, `weight`, `workout` (em `src/styles/components/`).
- Mensagens: os namespaces `fitness` e `body` de `messages/{pt-PT,pt-BR,en}.json`, mais o que os componentes de base usam de `common`.
- Linhas do `docs/COMPONENTS.md` das secções do Corpo (F16 e F17) e regras do `docs/DECISIONS.md` sobre o Foco no corpo (F16, F17 e as entradas "Treino" do fim do ficheiro).

### Base partilhada que tem de ser copiada (o código do corpo importa isto)
- `src/lib/dates.ts`, `src/lib/weeks.ts`, `src/lib/weight.ts`, `src/lib/db.ts`, `src/i18n/*` (locales e translator), `src/auth.ts`, `src/auth.config.ts`, `src/lib/auth/*`, `src/middleware.ts`.
- UI: `Button`, `TextInput`, `SegmentedControl`, `GlassCard`, `CheckChip`, `MagicIcon` (com `src/lib/icons.ts` e os ícones que o corpo usa), `RouteError`, `AmbientBackground`, `ThemeSync`, `EntitlementsProvider`, `NotificationsPromptCard`, `WellbeingConsentCard`.
- `src/styles/tokens.css` (temas claro e escuro, incluindo `--body-accent` e as cores `--metric-*`) e o `index.css` só com o que se usa.
- Notificações push: `src/lib/notifications/send.ts`, o modelo `PushSubscription`, `public/sw.js` e o pedido de permissão.
- Entitlements reduzidos a um recurso (premium do app novo), `src/inngest/client.ts`, Sentry, rate limit (Upstash), e-mail (Resend) para verificação e recuperação de senha.
- Configuração: `next.config.mjs` (com `outputFileTracingIncludes` para `content/exercises/**`), `tsconfig`, ESLint, Vitest, `CLAUDE.md` adaptado.

## 3. Pontos de ligação no MYGLOW (o que tirar ou trocar)

| Ficheiro | O que faz hoje | No MYGLOW depois da separação |
|---|---|---|
| `src/app/(app)/layout.tsx` | pílula "Sessão em andamento" | tirar |
| `src/components/day/BodyFocusBar.tsx` | título "Foco no meu corpo" abre os treinos | sem link (ou link externo para o app novo) |
| `src/components/day/DayPage.tsx` + `GuidedStartCard` | destaque do Corpo abre `/body` para premium | voltar sempre ao Corpo passo a passo |
| `src/app/(app)/guided/day/[date]/[flow]/page.tsx`, `GuidedRunner`, `StepWeight`, `StepBodyChecks`, `src/lib/guided/flows.ts` e `server.ts` | peso do dia no fim da manhã e "Abrir o Foco no corpo" | tirar o passo `dailyWeight` e o botão |
| `src/components/week/WeekView.tsx`, `WeekWeightAverage.tsx`, `src/lib/week/queries.ts`, `src/lib/planner/queries.ts`, `src/types/week.ts` | média do peso diário na Semana | fica só o peso semanal escrito à mão (já existe) |
| `src/lib/recap/server.ts`, `src/lib/stats/period.ts` | peso dos registos diários na Retrospectiva | só o peso semanal |
| `src/lib/guide/input.ts`, `server.ts` (`guideIncludeBody`) | o Guia lê o peso e os treinos | tirar a parte do corpo e a autorização à parte |
| `src/app/(app)/settings/page.tsx` | cartão "o Guia lê também o corpo" (`BodyGuideCard`) | tirar |
| `src/lib/account/export.ts`, `src/app/api/account/export/route.ts` | exportação inclui treinos e peso | tirar (passa a ser do app novo) |
| `src/lib/notifications/schedule.ts` | tipos `WEIGH_IN` e `REST_DONE` | deixar os valores no enum (histórico), sem envio |
| `src/lib/entitlements/features.ts` | recurso `body-pro` | tirar o recurso |
| `src/lib/journey/content.ts` e `content/journey/*` | a etapa 4 fala da entrada no Foco no corpo | rever o texto |
| `src/inngest/functions/fitnessRestAlert.ts` | push do descanso | sai do MYGLOW |
| `package.json` `vercel-build` | corre `seed-exercises.ts` em cada deploy | tirar do build do MYGLOW |

## 4. Banco de dados do app novo

Começar com um Postgres novo (Neon, como o MYGLOW) e uma migração inicial limpa, sem copiar o histórico de migrações do MYGLOW.

- Modelos do corpo: `Exercise` (+ enums `ExerciseSource`, `ExerciseMeasure`), `FitnessPrefs`, `FitnessProgram`, `FitnessWorkout`, `WorkoutItem`, `FitnessSession`, `SessionSet`, `BodyWeightEntry`, `BodyGoal` (+ `BodyGoalDirection`).
- Base: `User` só com o que o app usa (e-mail, nome, `passwordHash`, `locale`, `timezone`, `theme`, verificação de e-mail, termos e privacidade, plano, `wellbeingConsentAt`, `createdAt`), tokens de verificação e recuperação, `PushSubscription`, `NotificationLog` (para o `REST_DONE`), `FeatureOverride` (premium manual).
- Peso e meta são dados de saúde: manter o consentimento de bem-estar antes de mostrar ou gravar peso, como no MYGLOW.

## 5. Migração das contas e dos dados (uma vez)

1. Escolher quem migra: utilizadores do MYGLOW com qualquer `FitnessSession`, `BodyWeightEntry`, `BodyGoal`, `FitnessProgram` ou exercício próprio.
2. Script `scripts/migrate-from-myglow.ts` no repositório novo, com `MYGLOW_DATABASE_URL` (só leitura) e `DATABASE_URL` (o novo):
   - cria o `User` pelo e-mail, copiando `passwordHash` (bcrypt), `locale`, `timezone`, `theme`, `emailVerifiedAt`, `wellbeingConsentAt`; quem tinha `body-pro` recebe premium;
   - copia os exercícios próprios (`source = CUSTOM`) com os mesmos ids; os da biblioteca vêm do seed, com os mesmos ids;
   - copia programas, treinos, itens, sessões, séries, pesagens e meta, mantendo os ids;
   - é idempotente (upsert por id) e mostra no fim quantos registos copiou por tabela.
3. Correr o seed da biblioteca no banco novo antes do script.
4. Avisar quem migra (e-mail ou anúncio no MYGLOW): o mesmo e-mail e senha servem no app novo. Atualizar a Política de Privacidade dos dois apps (os dados passam para outro serviço do mesmo responsável).
5. Só apagar as tabelas do corpo no MYGLOW depois de conferir os números e com um backup feito.

## 6. Vercel e serviços do app novo

1. Repositório GitHub novo (ex.: `eedroo/foco-no-corpo`).
2. Projeto Vercel novo ligado a esse repositório; Build Command `prisma generate && prisma migrate deploy && tsx prisma/seed-exercises.ts && next build`.
3. Variáveis de ambiente (configurar na Vercel; nada disto vai para o repositório nem para o chat):
   - `DATABASE_URL`, `DIRECT_URL` (Neon novo);
   - `AUTH_SECRET` (novo), `AUTH_URL`, `APP_URL` (domínio novo);
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (par novo, gerado com `npx web-push generate-vapid-keys`; a chave privada só na Vercel);
   - `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` (app novo no Inngest, endpoint `/api/inngest`);
   - `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` (domínio verificado no Resend);
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (pode ser uma base nova);
   - `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (projeto Sentry novo, região EU);
   - `BLOB_READ_WRITE_TOKEN` (só se as imagens forem reenviadas, ver abaixo);
   - `LEGAL_TERMS_VERSION`, `LEGAL_PRIVACY_VERSION`, `ADMIN_EMAILS`.
   - Não precisa: `OPENAI_*`, `GUIDE_CONSENT_VERSION`, `BETA*`.
4. Imagens dos exercícios: o `content/exercises/images.json` aponta para o Vercel Blob do projeto MYGLOW. Na v1 o app novo pode usar os mesmos URLs. Antes de apagar esse Blob do MYGLOW, correr `scripts/fitness/import-images.ts` no app novo (com o seu `BLOB_READ_WRITE_TOKEN`) para ter cópia própria.
5. Domínio, PWA (manifest com nome e ícones novos, `sw.js` com o push do descanso), `/api/health` e monitorização.

## 7. Ordem de trabalho sugerida para o app novo

1. Criar o repositório com a base copiada do MYGLOW (§2, "Base partilhada"), já com login, temas, i18n e testes a passar.
2. Schema e migração inicial (§4); seed da biblioteca.
3. Trazer `lib/fitness`, `lib/body`, actions, API e o job do descanso, com os testes.
4. Trazer as rotas e os componentes (sem o prefixo `/body`), as mensagens e o CSS.
5. Onboarding próprio (hoje `body/welcome`), definições, exportação de dados e apagar conta.
6. Deploy na Vercel com as variáveis (§6) e teste num telemóvel (treino, descanso com push, peso e meta).
7. Script de migração (§5): ensaio num banco de teste e depois a sério.
8. No MYGLOW: anúncio "O Foco no corpo mudou de casa" com link; depois tirar os pontos de ligação (§3) num commit; por fim, depois de um período de segurança, uma migração que apaga as tabelas do corpo.

## 8. Depois (opcional): ponte entre os dois apps

Se fizer falta voltar a ligar os dois apps (o treino marcar o diário, o peso na Semana), o caminho é uma API pequena no app novo
(`/api/bridge/day?date=`), com um token por utilizador gerado no MYGLOW e autorização explícita da pessoa,
em vez de partilhar o banco.

## 9. Texto para começar o outro chat

> Vamos criar o app independente "Foco no corpo" a partir do MYGLOW. Lê `docs/FOCO-NO-CORPO-SEPARACAO.md` no
> repositório `eedroo/myglow` (branch `claude/myglow-fase-1-fundacoes-9il6hz`) e segue a ordem da secção 7.
> Decisões: [preencher a tabela da secção 1]. O repositório novo é `eedroo/<nome>`. Nunca me peças chaves nem senhas no
> chat: as variáveis vão direto para a Vercel.
