# MYGLOW — Arquitectura

PWA que junta diário mágico, planner (dia / semana / mês / ano) e grimório astrológico personalizado, com gamificação por XP e níveis.

## Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js 14 App Router, TypeScript strict |
| Dados | Prisma + PostgreSQL (Neon). `DATABASE_URL` (pooled, runtime) e `DIRECT_URL` (migrations) |
| Auth | Auth.js v5 (`next-auth@beta`), Credentials, sessão JWT, `bcryptjs` custo 12 |
| Validação | Zod em todas as fronteiras (Server Actions, route handlers) |
| i18n | `next-intl` sem prefixo de URL; locale no cookie `NEXT_LOCALE` |
| Tema | `next-themes` com `attribute="data-theme"` (light / dark / system) |
| Datas | `luxon` para fusos históricos; `Intl.DateTimeFormat` para apresentação |
| Ícones | `lucide-react` só para ícones de linha e placeholders de `MagicIcon` |
| Geocoding | Open-Meteo Geocoding API (sem chave; devolve `timezone` IANA) |
| CSS | CSS próprio por componente; fontes Cormorant Garamond + Jost via `next/font/google` |
| IA | OpenAI (`openai`, saída estruturada com `zodResponseFormat`) — só dentro de funções Inngest |
| Jobs | Inngest (cron + eventos), endpoint `/api/inngest` |
| Rate limit | Upstash Redis (`@upstash/ratelimit`) |
| Push | Web Push (`web-push`, VAPID) + service worker `public/sw.js` |
| Testes | Vitest |
| Deploy | Vercel |

## Regras

1. **CSS por classes de componente.** `docs/COMPONENTS.md` é a fonte de verdade. Cada componente tem as suas classes em `src/styles/components/<nome>.css`, prefixo `mg-`, BEM. Inline style só para um ajuste pontual numa instância. Nunca Tailwind.
2. **Tokens.** Cores, espaçamentos, raios, sombras, blur e tipografia existem apenas como CSS variables em `src/styles/tokens.css`, para `[data-theme="light"]` e `[data-theme="dark"]`. Os ficheiros de componente só usam `var(--…)`.
3. **Tema claro por defeito**, com opção LIGHT / DARK / SYSTEM persistida em `User.theme`.
4. **Server vs client.** Páginas e leitura de dados são Server Components (Prisma só no servidor, via `src/lib/db.ts`). Mutações por Server Actions (`src/actions/*`) validadas com Zod. `'use client'` só em componentes interactivos. Nunca importar Prisma num client component.
5. **Datas.** Timestamps em UTC. Datas de calendário (`@db.Date`) são interpretadas no fuso IANA do utilizador (`User.timezone`).
6. **Números.** Peso em gramas inteiras (`Int`). Escalas de humor `Int` 1–5. Coordenadas `Float`.
7. **Enums fixos** (Prisma) para áreas de projecto, fases da lua, signos, fontes de XP.
8. **i18n.** Nenhum texto visível hardcoded — tudo em `messages/pt-PT.json`, `messages/pt-BR.json`, `messages/en.json`. Cada língua escrita de forma nativa (PT-PT: "ecrã", "registar", "telemóvel", "tu"; PT-BR: "tela", "cadastrar", "celular", "você").
9. **Alterações cirúrgicas.** Editar apenas o necessário; não reescrever ficheiros existentes.
10. **Commits:** um commit único por fase, no fim, com testes, `tsc` e build a passar (ex.: `feat(fase-4): …`).
11. **Acessibilidade.** `prefers-reduced-motion` respeitado; contraste AA; todos os controlos com label.

## Domínio

- **Semana começa ao domingo.** `Week.startDate` é sempre um domingo; `year`/`month` são os do domingo; `weekOfMonth` 1..5.
- **Períodos** (`ProjectIntention.periodStart`, `XpEvent.periodStart`): domingo da semana, dia 1 do mês, 1 de Janeiro do ano.
- **Áreas de projecto:** `MAGIC`, `PERSONAL`, `LEISURE`, `PROFESSIONAL`, `STUDIES`.
- **Nascimento:** `BirthProfile.birthDate` + `birthTime` são locais ao `timezone` do local de nascimento. `birthUtc` é calculado com Luxon (`toBirthUtc`, fuso histórico). Sem hora conhecida usa 12:00 local e o mapa é calculado sem ascendente nem casas (`birthTimeKnown = false`).
- **Conteúdo IA:** `SignContent` (partilhado por signo/período/língua) e `UserAiContent` (por utilizador) são tabelas separadas porque em Postgres `NULL` numa unique constraint não colide.
- **Notificações:** `NotificationLog.periodKey` garante envio único por período (`2026-05-06`, `2026-W05-03`, `2026-05`).

### Datas de calendário

- O "dia" é sempre calculado no fuso do utilizador (`User.timezone`) com `todayInTz`.
- Uma data de calendário circula como string `YYYY-MM-DD` (`DateISO`) e só vira `Date` na fronteira com o Prisma, com `toDbDate` / `fromDbDate` (meia-noite UTC) de `src/lib/dates.ts`.
- **Proibido:** `new Date('YYYY-MM-DD')` solto e `toLocaleDateString` para chaves — origem clássica de bugs de "dia anterior".
- `dayBoundsUtc` devolve `[00:00, 24:00)` locais; em dias de mudança de hora dura 23 ou 25 h.

### Astrologia (`src/lib/astro/`, `astronomy-engine`)

- Zodíaco tropical, longitudes na eclíptica verdadeira da data, geocêntricas.
- **Céu do dia:** Sol ao meio-dia local. **Fase da lua:** se uma fase principal exacta (0/90/180/270°) cai dentro do dia local, a fase do dia é essa (a lua cheia aparece num só dia, como nos calendários); senão, fase intermédia pelo ângulo Sol–Lua ao meio-dia local. **Signo da lua:** ao meio-dia local, com hora de ingresso se muda de signo durante o dia.
- **Mapa natal:** calculado no onboarding e gravado em `BirthProfile.natalChart` (JSON com `version: 1`, validado com Zod ao ler). `ensureNatalChart` faz backfill para contas antigas ao abrir o diário.
- **Casas por signo inteiro** (whole sign): estáveis em qualquer latitude (Placidus falha acima dos círculos polares) e o sistema mais usado na astrologia contemporânea. `houseSystem` fica no JSON para permitir outros sistemas.
- Sem hora de nascimento: mapa ao meio-dia local, sem ascendente, meio-do-céu nem casas; `moonSignUncertain` se a Lua mudou de signo nesse dia.

### Céu do grimório (`src/lib/astro/skyEvents.ts`)

- `getSkyEvents(from, to, tz, hemisphere)`: fases principais (`getMoonEvents`), eclipses (`SearchLunarEclipse` / `SearchGlobalSolarEclipse`, signo = lua no pico), ingressos do Sol (`SearchSunLongitude(k·30°)`), equinócios/solstícios (`Seasons`), sabbats (Sol a 315/0/45/…/270°) e estações de Mercúrio, Vénus e Marte (velocidade eclíptica amostrada por dia; mudança de sinal refinada com `Search`). Ordenado por instante; `date` = dia local.
- `getRetrogradePeriods(from, to, tz)`: pares retrógrado → directo que tocam o intervalo, procurando 120 dias antes e depois.
- Os componentes usam sempre as versões com cache de `skyCache.ts` (`unstable_cache`, `revalidate: false`).
- Hemisfério (`User.hemisphere`): `guessHemisphere(tz)` no 1.º onboarding, editável nas definições; `prisma/scripts/backfill-hemisphere.ts` (`npx tsx`) para contas antigas.

### Planners mensal e anual

- `/month` e `/month/AAAA-MM` → `MonthPlannerPage`: intenção, metas por projecto, calendário com marcadores do céu, céu do mês, retrógrados, semanas, estatísticas (não em meses futuros), reflexão.
- `/year` e `/year/AAAA` → `YearPlannerPage`: palavra, intenção, metas, 12 meses com mini-calendário, Roda do Ano, retrógrados, humor por mês, estatísticas, reflexão.
- Estatísticas em `src/lib/stats/period.ts` (funções puras). Gráficos em SVG próprio, sem bibliotecas.
- Cartões partilhados por semana, mês e ano em `src/components/period/`.
- Autosave: `useMonthAutosave` / `useYearAutosave` sobre `useAutosaveQueue`; `patchMonth` / `patchYear` numa transacção (`Month`/`Year` + `ProjectIntention`).

### Glow (gamificação, `src/lib/xp/`)

- Regras puras e testadas: `rules.ts` (pontos, critérios, janelas), `streak.ts` (streak mágico e bónus), `levels.ts` (7 níveis), `window.ts` (estado da janela para a UI).
- `award.ts` (servidor): `awardXp` numa transacção — `INSERT … ON CONFLICT DO NOTHING RETURNING` no ledger `XpEvent` (unique `(userId, source, periodStart)`), bónus de streak para os dias afectados, `xpTotal` incrementado só com os pontos criados, `bestMagicStreak` actualizado. **Não usar `create` + apanhar P2002 dentro da transacção**: em Postgres o erro aborta a transacção inteira.
- `safeAwardXp` é chamado por `patchDailyEntry`, `patchWeek`, `patchMonth` e `patchYear` depois de gravar; nunca faz falhar a gravação. O resultado (`xp`) chega ao cliente via `useAutosaveQueue({ onResult })` → `GlowProvider` (toasts, diálogo de nível, `router.refresh()`).
- `/profile` (`JourneyPage`): nível, caminho dos níveis, streak mágico, histórico.
- Manutenção: `npx tsx prisma/scripts/recompute-xp.ts [--dry-run]` recalcula `xpTotal` e `bestMagicStreak` a partir do ledger (fonte de verdade).

### Grimório IA (Fase 6, `src/lib/ai/`, `src/inngest/`)

**A app calcula, a IA interpreta.**

- `lib/astro/aspects.ts`: aspectos trânsito → natal (orbes 8/8/6/6/4; Lua em trânsito com metade), rótulos estáveis `MOON_TRINE_NATAL_SUN`.
- `lib/ai/facts.ts`: factos do dia/período (lua, Sol, retrógrados, eventos, aspectos, casa da Lua, intenções). Conteúdo por signo usa `{ shared: true }`: UTC, sem horas e sem sabbats.
- `lib/ai/schemas.ts` (Zod) + `validate.ts` (datas no período, rituais em datas de eventos, rótulos de trânsitos existentes, signos da Lua/Sol só os dos factos, nas 3 línguas). À OpenAI vai uma versão "de fio" do esquema sem limites de texto (modo estrito); os limites vão no prompt e são verificados depois.
- `lib/ai/localize.ts`: acrescenta `name` localizado a eventos, fases e aspectos e um glossário identificador → nome (a partir de `messages/*.json`); `validate.checkLeaks` rejeita identificadores e inglês no texto. `PROMPT_VERSION` fica gravado: conteúdo de uma versão anterior regenera-se no período aberto (no passado continua a mostrar-se).
- `lib/ai/prompts/*`: um `build(facts, locale)` por tipo; `system.ts` com `PROMPT_VERSION` e as regras (língua nativa, só factos, sem fatalismo, sem conselhos médicos/financeiros/legais, rituais seguros).
- `lib/ai/generate.ts` (`generateSignContent`, `generateUserContent`): já existe e é válido? → factos → prompt → OpenAI (`openai.ts`, modelo por tipo) → Zod → validação (1 retry com a razão) → upsert com `model` e `promptVersion`. Ids dos rituais gerados em código (`rituals.ts`).
- **Fluxo:** cron Inngest `signMonthly` (dia 20 → mês seguinte; 12 signos × 3 línguas) — desde a v3 dos prompts o dia e a semana só têm leitura pessoal (os crons `signDaily`/`signWeekly` foram retirados; poupa ~36 pedidos/dia + 36/semana) e `userDispatch` de hora a hora (activos ≤ 7 dias, lotes de 500; `dueUserJobs` em `schedule.ts`: 03:xx locais → dia; quinta → semana seguinte; dia 24 → mês seguinte + rituais) enviam `ai/sign.generate` / `ai/user.generate`; `generateSign` / `generateUser` geram (idempotência pela chave `kind:periodStart:sign|userId:locale`, concorrência 5, 3 retries, throttle).
- **Páginas só lêem** (`lib/ai/queries.ts` → `AiState` ready / pending / unavailable; payload inválido = pending). Em falta num período aberto → `ReadingPending` chama `requestAiContent` (Server Action, 10/h por utilizador no Upstash; sem Upstash não limita) e faz `router.refresh()` a cada 10 s durante 1 min. Onboarding e mudança de língua pedem hoje, esta semana e este mês.
- **Privacidade:** para a IA vão só factos astrológicos, o resumo do mapa natal, o locale e os pronomes. Nada do diário é lido pela geração. `privacy.test.ts` garante que nome, email, intenções, metas, reflexões, gratidão, resumos, humor, peso, banimentos e notas nunca entram nos prompts.
- `addRitualToWeek`: acrescenta `✦ {título} ({n} min)` à nota do dia na semana do ritual, pela mesma transacção de `patchWeek` (`lib/week/save.ts`).
- Env validado com Zod em `lib/env.ts`; em produção o arranque regista um erro com as variáveis em falta (`src/instrumentation.ts`), mas não impede a app de funcionar — sem elas a IA fica desactivada. Em dev sem chaves as páginas mostram "a preparar" e os eventos não são enviados (com o dev server do Inngest: `INNGEST_DEV=1`).
- **Fornecedor:** qualquer API compatível com a da OpenAI. Com `OPENAI_BASE_URL` apontado para o Gemini (Google AI Studio) usa-se a chave do AI Studio e modelos `gemini-*`. `AI_REQUESTS_PER_MINUTE` ajusta o throttle do Inngest e a concorrência do seed ao limite do plano; o cliente repete sozinho em 429. `npm run ai:check` lista os modelos da chave e gera um horóscopo de teste sem gravar.
- **Linguagem (v3):** nada de termos técnicos soltos (quadratura, trígono, casa 1…): cada trânsito é descrito pelo efeito e pelo convite; aspectos com imagens fixas (tensão, harmonia, lado a lado, frente a frente, boa parceria) e pontos do mapa explicados na primeira menção. A leitura pessoal do dia tem título poético, 3 palavras-chave e o cristal do dia; os chips de trânsito lêem-se como frase ("Saturno em tensão com o teu Ascendente") e o nome técnico fica no detalhe. Leituras gravadas antes da v3 continuam legíveis (`USER_READ_SCHEMAS`). Nota: no plano gratuito do Gemini, o Google pode usar os pedidos para melhorar os seus produtos (os prompts só levam factos astrológicos e, com o toggle, intenções).
- **Seed no deploy:** `npm run ai:seed` gera o conteúdo por signo de hoje, desta semana e deste mês (`prisma/scripts/seed-ai.ts`, salta o que existe; `-- --only=DAY_HOROSCOPE`).

### Notificações (Fase 7, `src/lib/notifications/`, `src/lib/push/`)

- **Chaves VAPID:** `npx web-push generate-vapid-keys` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (vai para o browser), `VAPID_PRIVATE_KEY` (só servidor) e `VAPID_SUBJECT` (`mailto:…`). Sem elas não há push, mas os avisos continuam na caixa da app.
- **Regras** (`schedule.ts`, puro): `dueCandidates` só pelos horários (slot de 15 min, sem DB) e `dueNotifications` filtra pelo que está por fazer (`notificationState`: `computeDayProgress` e os critérios `planMet`/`reflectionMet` do Glow). Semana e mês com desfasamento de +15/+30 min; últimas chamadas (`WEEK_PLAN_LAST` terça, `WEEK_REFLECTION_LAST` domingo, `MONTH_PLAN_LAST` dia 7, `MONTH_REFLECTION_LAST` dia 1) à noite com o mesmo desfasamento. Os convites (manhã, domingo, dia 1) usam o `headline` da leitura IA já gerada, se existir. `periodKey`: `2026-05-06`, `W2026-05-03`, `M2026-05`. Grimório: `GRIMOIRE` à hora `grimoireTime` (10:00 por defeito) se há lições novas por fazer hoje (`getGrimoireDayStatus`: limite diário e cursos abertos) ou um quiz por fazer; `GRIMOIRE_LAST` 45 min depois da noite (com `lastCall`) só se ainda faltam lições do dia. Sem pedido HTTP não há o cookie "ler em português": em inglês só avisa quando houver cursos em inglês.
- **Fluxo:** Inngest `notifications-dispatch` a cada 15 min → utilizadores onboarded, com lembretes activos e activos nos últimos 30 dias (lotes de 500) → só quem tem um aviso no slot calcula o estado → `buildNotification` (texto na língua, lua do dia, sabbat, ritual) → `deliver`: `NotificationLog.create` primeiro (a unique `userId, kind, periodKey` impede duplicados com retries) → `web-push` para todos os dispositivos (TTL 4 h; 404/410 apagam a subscrição) → `pushed = true` se ≥ 1 envio. Cada utilizador é isolado (um erro regista-se e não trava os restantes). **Deploy:** o Inngest tem de estar sincronizado com um URL estável (domínio de produção ou integração Vercel, que ressincroniza a cada deploy), nunca com o URL de um deploy concreto; `GET /api/inngest` mostra `function_count` (7) e, no painel do Inngest, `notifications-dispatch` tem de aparecer com execuções a cada 15 min.
- **Caixa de avisos:** o sino da `TopBar` lê `NotificationLog` (últimos 30) — funciona sem push. Tocar marca como lido e navega.
- **Permissão e subscrição** (`lib/push/client.ts`): só depois de "Activar" (cartão em `/today` a partir do 2.º dia, "Agora não" = cookie 14 dias; ou nas definições). O SW regista-se sozinho em produção; ao subscrever garante-se o registo também em desenvolvimento.
- **iPhone/iPad:** Web Push só com a app instalada no ecrã principal (iOS 16.4+); fora disso mostra-se o `InstallGuide`. Android/desktop: `InstallButton` com `beforeinstallprompt`.
- Teste e2e: o PushManager e a permissão são simulados (o Chromium headless nega sempre a permissão e não há FCM).

### Grimório — trilha de conhecimento (Fase 8, `content/grimoire/`, `src/lib/grimoire/`)

- **Conteúdo é dados:** `content/grimoire/index.json` (ordem, `required`, línguas publicadas de cada curso) + `content/grimoire/<slug>/<locale>.json` (curso completo: lições com cards e perguntas de revisão, quiz de 5 perguntas, emblema). Validado com Zod (`schema.ts`); texto dos cards só aceita `**negrito**` (`markdown.ts`, sem HTML). Lido do disco no servidor com cache em memória (`content.ts`); `next.config.mjs` inclui `content/grimoire/**` no bundle das funções.
- **Acrescentar um curso:** criar `content/grimoire/<slug>/pt-BR.json` (mesmo formato do Anexo A da F8), acrescentar a linha ao `index.json` (`slug`, `order`, `required`, `locales`) e correr `npm run content:check` (também corre no `vitest`). Ícones novos entram em `MAGIC_ICON_NAMES`. Nenhum código a tocar.
- **Língua** (`resolveContentLocale`): pt-BR → pt-BR; pt-PT → pt-PT se existir, senão pt-BR; en → en se existir, senão pt-BR só com o cookie `mg_grimoire_pt=1` ("Read in Portuguese"), senão "coming soon".
- **Regras** (`rules.ts`, puras): obrigatórios em sequência, livres abertos quando todos os obrigatórios estão concluídos (não depende do nível); lições sequenciais; 3 lições novas por dia no fuso do utilizador (`LessonProgress.completedDate`), rever ilimitado; revisão espaçada Leitner 1/3/7/21/60 dias (`ReviewItem`, até 2 revisões no início de cada lição, as mais atrasadas); quiz aprova com 4/5.
- **Progresso:** `LessonProgress` (unique por lição), `CourseProgress` (tentativas, melhor nota, `completedAt` = emblema), `ReviewItem`. Actions `completeLesson` / `submitQuiz` validam tudo no servidor; o curso concluído dá 100 Glow com `XpEvent` `COURSE_COMPLETE` e `refId` = slug (a unique passou a `userId, source, periodStart, refId`).
- **Rotas:** `/grimoire` (mapa, no grupo `(app)`); `/grimoire/[course]/[lesson]` e `/grimoire/[course]/quiz` em ecrã inteiro no grupo `(focus)` (sem `TopBar`/`BottomNav`, com `GlowProvider`). Bloqueio, limite ou curso fechado → `redirect('/grimoire?notice=…')`.

### Novidades (pop-up "Novidades MYGLOW", `src/lib/whats-new/`)

- **Curso novo:** acrescentar `"publishedAt": "AAAA-MM-DD"` à linha do curso em `content/grimoire/index.json`. É anunciado automaticamente ("Curso «…» já disponível no Grimório"), só a quem lê o curso na sua língua.
- **Funcionalidade nova:** acrescentar um lançamento a `content/whats-new.json` (`id`, `date`, até 6 `items` com `icon`, `href` opcional e `text` em pt-BR, pt-PT e en). Validado por `npm run content:check`.
- Regra (`rules.ts`, pura): só novidades com data **posterior** ao registo do utilizador (para quem chega depois já não é novidade) e ainda não vistas (`AnnouncementSeen`, unique `userId, key` com `release:<id>` / `course:<slug>`). O `WhatsNewDialog` abre no layout `(app)`; fechar ou tocar num item marca tudo como visto.

### Diário

- Hoje e dias passados são editáveis (permite transcrever o diário em papel); dias futuros não existem no diário — a intenção para o futuro vive no planner semanal (F3). Datas anteriores a 2000-01-01 são rejeitadas.
- `DailyEntry` é criado no primeiro patch, com um snapshot de `moonPhase` e `moonSign` desse dia.
- Gravação automática (`useDailyAutosave`): checks/escalas imediatos, textos com debounce de 800 ms e flush no blur, um pedido de cada vez, modo offline com repetição no evento `online` e a cada 15 s.
- Na UI os textos vazios são `''`; na DB são `null`.

## Autenticação e fluxo

- `src/auth.config.ts` — config edge-safe (sem Prisma/bcrypt), usada pelo `middleware`.
- `src/auth.ts` — Credentials + Prisma + bcrypt. JWT com `id`, `name`, `email`, `locale`, `theme`, `onboarded`. `trigger === 'update'` refresca `onboarded`, `locale`, `theme`, `name` a partir da DB.
- `src/middleware.ts`:
  - não autenticado em rota da app → `/login`
  - autenticado e `!onboarded` → `/onboarding`
  - autenticado e onboarded em `/login`, `/register`, `/onboarding` → `/today` (excepto `/onboarding?edit=1`)
- Fluxo: registo → onboarding obrigatório → `/today`.
- Após mutações que mudam o token (onboarding, definições) o cliente chama `useSession().update({})`. **Tem de levar argumento**: sem ele o Auth.js faz só um GET e o callback `jwt` não recebe `trigger: 'update'`.
- Tema sem piscar: o root layout passa `User.theme` como `defaultTheme` ao next-themes (novo dispositivo) e `ThemeSync` corrige o `localStorage` se divergir da DB.
- `/onboarding?edit=1` não altera `User.timezone` nem `onboardedAt` (o fuso passa a ser gerido nas definições) e limpa `natalChart` para recálculo.

### Conta, email e privacidade (Fase 9, `src/lib/auth/`, `src/lib/email/`, `src/emails/`, `src/lib/account/`, `src/actions/account.ts`)

- **Tokens de email** (`lib/auth/tokens.ts`): 32 bytes aleatórios (`crypto.randomBytes`) em base64url, só no URL do email; na DB (`AuthToken`) fica **apenas o hash SHA-256**. Uso único (`usedAt` marcado com `updateMany … where usedAt: null` numa transacção) e expiração: confirmação 24 h, recuperação e alteração de email 1 h. Criar um token apaga os anteriores do mesmo tipo.
- **Sessões** (`lib/auth/session.ts`, puro): o JWT leva `sv` (= `User.sessionVersion` à entrada) e `svCheckedAt`. No callback `jwt` de `auth.ts` (Node), passados 5 min — ou em `trigger: 'update'` — relê a `sessionVersion` (uma vez por pedido, `React.cache`); se mudou ou o utilizador não existe, devolve `null`. `sessionVersion++` em: reset e alteração de palavra-passe, "terminar sessão em todos os dispositivos" e alteração de email. A alteração de palavra-passe volta a fazer `signIn` no dispositivo actual. Como os Server Components não podem apagar o cookie e o middleware (edge, sem DB) ainda o aceita, os layouts `(app)` e `/onboarding` redireccionam sessões inválidas para `GET /api/session/end` (faz `signOut` → `/login`).
- **Login:** rate limit 5 tentativas / 15 min por email + IP (dentro do `authorize`; mesma mensagem de credenciais erradas). Recuperação: 3/h por IP e por email — a resposta é sempre a mesma (não revela se o email existe nem se foi limitado). Reenvio da confirmação 3/h; exportação 3/dia.
- **Email** (`lib/email/send.ts`): Resend em produção, sempre com `replyTo: EMAIL_REPLY_TO`; em `NODE_ENV=test`, ou fora de produção sem `RESEND_API_KEY`, fica em memória (no `globalThis`, partilhado entre bundles do dev) e na consola. `GET /api/test/last-email?to=` devolve o último (404 em produção; activo com `NODE_ENV=test` ou `EMAIL_TEST_ENDPOINT=1`, que o Playwright passa ao `next dev`). Nunca lança: uma falha de envio só é registada. Templates React Email em `src/emails/` (6: confirmação, recuperação, confirmar email novo, aviso ao email antigo, palavra-passe alterada, conta apagada), textos em `messages/*.json › emails` via `translatorFor` (na língua do utilizador). **Excepção à regra dos tokens:** os clientes de email não suportam CSS variables, por isso as cores dos emails são constantes em `src/emails/EmailLayout.tsx` (`EMAIL_COLORS`, alinhadas com o tema claro).
- **Exportação** (`GET /api/account/export`, `lib/account/export.ts` puro): JSON `myglow-export-v1` como anexo `myglow-export-YYYY-MM-DD.json`; lista explícita de campos — nunca `passwordHash`, tokens, chaves de push nem `sessionVersion`. Datas de calendário `YYYY-MM-DD`; peso em gramas e `weightKg`.
- **Apagar conta:** palavra-passe + palavra da língua ("APAGAR"/"DELETE"); `db.user.delete` (tudo em `onDelete: Cascade`); email `AccountDeleted`; `signOut` → `/goodbye`. As funções Inngest ignoram utilizadores entretanto apagados (`isUserGoneError`: P2003/P2025).
- **Consentimentos:** o registo exige Termos + Política (`termsVersion`, `privacyVersion`, `termsAcceptedAt`) e o consentimento de bem-estar (`wellbeingConsentAt`). Se as versões em `LEGAL_TERMS_VERSION`/`LEGAL_PRIVACY_VERSION` mudarem (ou nunca foram aceites, contas anteriores à F9), o layout `(app)` mostra `PolicyUpdateDialog` (bloqueante; as Novidades esperam).
- **Bem-estar sem consentimento** (`lib/account/consent.ts`): humor, "como acordei", sono e peso ficam desactivados no diário e na semana (nota + link para voltar a consentir) e as actions ignoram-nos ao gravar. `computeDayProgress(date, entry, { wellbeing: false })`: a manhã passa a ser intenção + banimento + ritual e a noite deixa de pedir o humor (o Glow continua a funcionar); `computePeriodStats` sem humor, sono nem peso. Retirar o consentimento pode apagar esses dados.
- **Idade mínima 16** (`isOldEnough` em `lib/account/age.ts`): verificada no passo 1 do onboarding e na action; a conta fica no onboarding com a opção de a apagar.
- **Documentos legais:** `content/legal/{privacy,terms}/{pt-PT,pt-BR,en}.md` (cabeçalho `version:`/`date:` + markdown mínimo: títulos, listas, links, citações), páginas públicas `/privacy` e `/terms` no grupo `(public)`; marcados como rascunho.
### Beta, boas-vindas e página pública (Fase 10, `src/lib/beta.ts`, `src/lib/onboarding/`, `src/components/{beta,welcome,landing}/`)

- **Env:** `BETA=true` mostra o selo (`BetaBadge` na `TopBar` e na landing), o aviso no registo e o link de feedback no `/today`; `BETA_INVITE_CODES` (vírgulas; trim + maiúsculas) fecha o registo por código — validado no servidor em `register` (10 tentativas/h por IP, erro genérico) e gravado em `User.inviteCode`; `FEEDBACK_EMAIL` recebe o feedback.
- **Feedback:** `sendFeedback` (sessão, Zod, 5/h) grava `Feedback` (com página, user agent e língua; `onDelete: SetNull`) e envia `FeedbackEmail` com `replyTo` = email do utilizador. Falha de email não falha a acção.
- **Fluxo de entrada** (`nextOnboardingStep`, puro): registo → `/onboarding` → `/welcome` (enquanto `welcomeSeenAt` é null) → `/today`. `saveBirthProfile` devolve o próximo passo. Contas antigas não são forçadas: o cartão de primeiros passos convida a ver a apresentação. `/welcome` pode ser revista (perfil, primeiros passos).
- **Primeiros passos** (`computeFirstSteps`, puro): intenção de hoje, ≥ 1 lição, plano da semana (intenção ou metas), lembretes activos num dispositivo ou cartão de lembretes dispensado. `FirstStepsCard` no topo do `/today` some quando tudo está feito ou com "Dispensar" (`firstStepsDismissedAt`).
- **Landing** (`/`): com sessão redirecciona para `/today`; sem sessão `LandingPage` (rota pública no middleware). Língua: cookie `NEXT_LOCALE` → `Accept-Language` → pt-PT (`LocaleSwitcher` grava o cookie). Sem sessão o tema segue o sistema. `AppPreview` usa as classes reais dos componentes com dados de exemplo (markup estático, sem DB nem hooks).
- **SEO:** `metadataBase` = `APP_URL`; metadata e Open Graph por língua em `/`; `opengraph-image.tsx` (`next/og`; cores em constantes, como nos emails); `sitemap.ts` (`/`, `/privacy`, `/terms`); `robots.ts` bloqueia a app e `/api`. `robots.txt`, `sitemap.xml` e `opengraph-image` estão fora do middleware.
- **Testes:** a partir desta fase só Vitest (+ verificação manual); os e2e Playwright existentes ficam no repositório mas fora da verificação.

- Rotas abertas com ou sem sessão (middleware): `/forgot-password`, `/reset-password`, `/verify-email`, `/confirm-email-change`, `/privacy`, `/terms`, `/goodbye`.

## i18n

- `src/i18n/locales.ts`: `PT_PT ↔ pt-PT`, `PT_BR ↔ pt-BR`, `EN ↔ en`; datas em `pt-PT` / `pt-BR` / `en-GB`.
- `src/i18n/request.ts`: cookie `NEXT_LOCALE` → `Accept-Language` (`pt-BR` → `pt-BR`; outro `pt*` → `pt-PT`; resto → `en`) → `pt-PT`.
- O cookie é escrito no login e ao guardar definições, a partir de `User.locale`.
- Namespaces: `common`, `auth`, `onboarding`, `settings`, `nav`, `shell`, `validation`, `dev`.
- Cores fora do CSS (meta `theme-color`, manifest) vivem só em `src/lib/theme.ts` (`SYSTEM_COLORS`), espelhando `tokens.css`.

## Desenvolvimento local

```bash
cp .env.example .env        # preencher DATABASE_URL, DIRECT_URL, AUTH_SECRET
npm install
npx prisma migrate dev      # aplica prisma/migrations
npm run dev                 # http://localhost:3000 · showcase em /dev/ui
npm test && npm run typecheck && npm run build
npm run test:e2e            # Playwright (arranca o next dev; precisa da DB local)
```

## Estrutura

```
prisma/schema.prisma        schema completo (todas as fases)
messages/*.json             textos por língua
src/actions/                Server Actions (auth, onboarding, settings)
src/app/(auth)/             login, register
src/app/(app)/              today, week, month, year, settings
src/app/onboarding/         recolha de dados de nascimento
src/app/dev/ui/             showcase (só fora de produção)
src/components/ui/          primitivos
src/components/shell/       shell da app
src/components/providers/   providers client
src/i18n/                   configuração next-intl
src/lib/                    db, birth, geocode, icons, theme, validation
scripts/icons-doc.ts        gera docs/ICONS.md (`npm run docs:icons`)
prisma/scripts/             scripts de manutenção de dados (`npx tsx …`)
src/styles/                 tokens, base, components/*
```

## Deploy (Vercel + Neon)

1. **Neon:** criar projecto (região Frankfurt `eu-central-1`). Copiar a *connection string pooled* (host com `-pooler`) → `DATABASE_URL` e a *directa* (sem `-pooler`) → `DIRECT_URL`. Ambas com `?sslmode=require`.
2. **Vercel:** importar o repositório GitHub. Framework Next.js (detectado). Em *Environment Variables*:
   - `DATABASE_URL`, `DIRECT_URL` (do Neon)
   - `AUTH_SECRET` (`openssl rand -base64 32`)
   - `AUTH_URL` não é necessário na Vercel (`trustHost: true`).
   - F10: `BETA`, `BETA_INVITE_CODES`, `FEEDBACK_EMAIL`.
   - F9: `RESEND_API_KEY`, `EMAIL_FROM` (domínio verificado no Resend), `EMAIL_REPLY_TO`, `APP_URL` (links dos emails), `LEGAL_TERMS_VERSION`, `LEGAL_PRIVACY_VERSION`.
3. O script `vercel-build` corre `prisma generate && prisma migrate deploy && next build`: as migrações são aplicadas ao Neon em cada deploy.
4. Verificar: registo → onboarding (pesquisa de local via Open-Meteo) → `/today`; Lighthouse → PWA instalável.

## Fases

1. **Fundações** (esta) — schema, auth, i18n, tema, onboarding, definições, shell PWA, primitivos.
2. Diário diário + mapa natal.
3. Semana.
4. Mês / Ano.
5. Gamificação (XP, níveis, streaks).
6. Conteúdo astrológico IA.
7. Notificações push.
