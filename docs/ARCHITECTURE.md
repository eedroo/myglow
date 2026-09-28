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
10. **Commits** com prefixos `feat:`, `fix:`, `style:`, `chore:`, `docs:`, `test:` — um commit por alteração lógica (uma funcionalidade, correcção ou ajuste), independentemente de quantos ficheiros toca. Não misturar alterações independentes no mesmo commit.
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
src/styles/                 tokens, base, components/*
```

## Deploy (Vercel + Neon)

1. **Neon:** criar projecto (região Frankfurt `eu-central-1`). Copiar a *connection string pooled* (host com `-pooler`) → `DATABASE_URL` e a *directa* (sem `-pooler`) → `DIRECT_URL`. Ambas com `?sslmode=require`.
2. **Vercel:** importar o repositório GitHub. Framework Next.js (detectado). Em *Environment Variables*:
   - `DATABASE_URL`, `DIRECT_URL` (do Neon)
   - `AUTH_SECRET` (`openssl rand -base64 32`)
   - `AUTH_URL` não é necessário na Vercel (`trustHost: true`).
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
