# MYGLOW — Decisões de arquitectura

Diário mágico + planner + grimório astrológico. PWA, PT-PT, PT-BR e EN (cada uma escrita de forma nativa), tema claro/escuro/sistema.

## Stack
- Next.js 14 App Router + TypeScript, Prisma + Neon (Postgres), Auth.js v5 (Credentials, JWT), Zod, Vercel
- CSS próprio com CSS variables + classes de componente (sem Tailwind, sem shadcn)
- next-intl (sem prefixo de locale no URL, locale via cookie + preferência do user; `PT_PT`, `PT_BR`, `EN`)
- next-themes (`data-theme`, opções LIGHT / DARK / SYSTEM, claro por defeito)
- astronomy-engine (lua, signos, mapa astral — cálculo local, sem API)
- Luxon (fusos horários históricos para hora de nascimento)
- Open-Meteo Geocoding (autocomplete do local de nascimento, devolve lat/lng + fuso IANA, sem chave)
- Inngest (jobs IA e notificações), OpenAI Structured Outputs + Zod, Web Push (VAPID)
- Vitest + Playwright

## Regras
- CSS: mapear componentes primeiro → cada componente tem classes em `src/styles/components/*.css` com prefixo `mg-`. Inline style só para ajuste pontual de uma instância reutilizada.
- Tokens de cor/espaço/raio/sombra só em `tokens.css` (claro e escuro).
- Server Components para páginas e leitura de dados (Prisma só corre no servidor). `'use client'` apenas em componentes interactivos.
- Datas do diário são datas de calendário (`@db.Date`) no fuso do user; timestamps em UTC.
- Peso em gramas inteiras. Escalas de humor 1–5 (acordar e humor).
- Enums fixos em código: ProjectArea, MoonPhase, ZodiacSign, XpSource, PeriodKind.
- Commits: um commit único por fase, no fim, com testes, `tsc` e build a passar (ex.: `feat(fase-4): …`). Alterações cirúrgicas, nunca reescrever ficheiros inteiros.
- Esta lista vive no projecto Claude (fonte de verdade) e é copiada para `docs/DECISIONS.md` no repo; cada prompt de fase termina a actualizar essa cópia.

## Regras de domínio
- Semana começa ao **domingo**. Pertence ao mês (e ano) em que cai o domingo. Numerada dentro do mês ("Semana 1 · Maio").
- Data + local de nascimento obrigatórios; hora opcional ("não sei a hora") → `birthTimeKnown=false`, cálculo às 12:00 local, mapa sem ascendente nem casas. `birthUtc` com fuso histórico.
- Lua do dia: snapshot ao meio-dia local gravado no DailyEntry. Fase principal (nova, quartos, cheia) só no dia em que o instante exacto acontece; restantes dias = fase intermédia pelo ângulo. Ingresso de signo durante o dia mostrado com hora.
- Mapa natal: casas por signo inteiro (whole sign), `houseSystem` no JSON para outros sistemas no futuro. Calculado no onboarding + backfill ao abrir o dia.
- Diário: hoje e passado editáveis (transcrever o papel); futuro não existe no diário (fica no planner semanal). Gravação automática (checks imediatos, texto com debounce 800 ms, fila + retry offline).
- Semana: editável no passado, presente e futuro (planear à frente, até 52 semanas). Título por defeito "Semana {n} · {mês}", editável. Registo criado só na primeira gravação.
- Peso: introduzido em kg (aceita vírgula ou ponto), gravado em gramas. Mostra diferença para a semana anterior. Libras ficam para depois.
- Progresso do dia (base da gamificação): Manhã completa = intenção + banimento matinal feito + ritual matinal + "como acordei"; Corpo completo = 3/3 checks; Noite completa = banimento nocturno feito + ritual nocturno + gratidão + humor + reflexão final. Sono (meta cumprida ou não) e resumo não contam — não se penaliza dormir mal. Nível do dia: vazio / parcial / completo.
- Mês (Fase 3): vista de navegação — calendário com fase da lua e progresso por dia, semanas do mês, eventos lunares. O planner mensal é acrescentado na Fase 4.
- Mês e ano (Fase 4): planners editáveis no passado e no futuro (mês até +12 meses, ano até +1). Intenção e reflexão em `Month`/`Year`; metas por projecto em `ProjectIntention` (`MONTH` com o dia 1, `YEAR` com 1 de janeiro); texto vazio apaga a meta. O `/month` passa a planner (mantém calendário e semanas).
- Céu do grimório: fases, eclipses, ingressos do Sol, equinócios/solstícios, sabbats e estações/retrógrados de Mercúrio, Vénus e Marte calculados localmente (astronomy-engine) e guardados em cache (`unstable_cache`, sem expiração — o céu não muda).
- Sabbats astronómicos (Sol a 315/0/45/90/135/180/225/270°), com o nome pelo hemisfério do utilizador (`User.hemisphere`, adivinhado pelo fuso no 1.º onboarding e editável nas definições): no Sul usa-se o nome da longitude +180° (ex.: Samhain no início de maio).
- Estatísticas de período: streak = dias seguidos com nível ≥ parcial, limitado ao período; se hoje ainda está vazio, a sequência conta até ontem. Dias futuros não contam para hábitos nem médias.
- Gamificação: ledger `XpEvent` com unique `(userId, source, periodStart)` → idempotente. XP não é retirado ao desmarcar. Um dia só gera XP se as secções forem concluídas até 24 h depois do fim desse dia (até às 23:59 do dia seguinte, no fuso do user); edições posteriores continuam permitidas mas não dão nem retiram pontos. Nível derivado do total com limiares em código. Separado da futura trilha de conhecimento.
- Conteúdo IA: partilhado por signo (`SignContent`) + camada personalizada (`UserAiContent`), gerado por job e em cache — nunca ao abrir a página.
- Notificações idempotentes via `NotificationLog` unique `(userId, kind, periodKey)`. iOS só com a app instalada no ecrã inicial (16.4+).

## Ícones
- 3D dourados (PNG gerados à mão) para destaque; glifos planos para fases/signos; lucide para UI de linha.
- Componente `MagicIcon` + registo `src/lib/icons.ts` com `ready` e fallback lucide. Inventário em `myglow/icones.md`.

## Planners
- Diário: lua/signo, data, intenção, Manhã (banimento nome+check, ritual, sono), como acordei (1–5 + nota), Foco no corpo (alongamento, treino, água), Noite (banimento nome+check, ritual), gratidão, humor (1–5), reflexão final, resumo do dia.
- Semanal: título, intenção da semana, 7 dias (texto), peso, intenções por projecto (Magic, Pessoal, Lazer, Profissional, Estudos), reflexão.
- Mensal: intenção, metas por projecto, luas nova/cheia (calculadas), rituais sugeridos (IA), resumo automático (dias feitos, streak, humor médio, peso), reflexão.
- Anual: palavra do ano, intenção, metas por projecto, grelha 12 meses com progresso, reflexão.

## Fases
1. Setup, schema completo, design system + mapa de componentes, tema, i18n, auth, onboarding natal, shell PWA
2. Página diária (vertical slice) + lua/signo do dia + cálculo do mapa natal
3. Planner semanal + navegação semana/mês
4. Planner mensal e anual
5. Gamificação (XP, níveis, streaks)
6. IA (horóscopo, energias dia/semana/mês, rituais)
7. Notificações push + preferências
