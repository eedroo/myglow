# MYGLOW — Mapa de componentes

Fonte de verdade da UI. Todo o componente listado aqui tem:

- **TSX** em `src/components/<grupo>/<Nome>.tsx`
- **CSS** em `src/styles/components/<ficheiro>.css`, importado por `src/styles/index.css`
- **Classes** com prefixo `mg-` e convenção BEM (`bloco`, `bloco__elemento`, `bloco--modificador`)
- Apenas `var(--…)` de `src/styles/tokens.css` — nunca cores, raios, sombras ou espaçamentos literais
- Nenhum texto visível próprio: o texto chega por props, vindo de `messages/*.json`

**Inline style** só é permitido para um ajuste pontual numa instância de um componente reutilizado (ex.: `style={{ marginTop: 'var(--space-6)' }}`). Nunca Tailwind.

Estado **F1** = implementado nesta fase. **F1 (showcase)** = implementado e visível apenas em `/dev/ui`. **F2…F7** = só documentado.

Referência visual: diário físico em papel — fundo creme com mármore dourado, cartões com cantos arredondados e contorno dourado fino, cabeçalhos de secção em pílula dourada com gradiente, ícones dourados 3D, cristais decorativos, labels em maiúsculas com tracking largo, rodapé "Pequenas escolhas, grandes transformações." Na app: **glassmorphism quente** — cartões de vidro fosco sobre um fundo com luzes douradas desfocadas em movimento lento.

---

## Primitivos (`src/components/ui/`)

### GlassCard — F1
- **TSX:** `GlassCard.tsx` (Server) · **CSS:** `card.css`
- **Classes:** `mg-card`, `mg-card__header`, `mg-card__title`, `mg-card__body`
- **Variantes:** `mg-card--accent` (borda dourada mais forte + brilho), `mg-card--flat` (sem blur, fundo opaco), `mg-card--interactive` (hover/focus elevado)
- **Props:** `as?: 'section' | 'div' | 'article'`, `variant?: 'accent' | 'flat' | 'interactive' | Array<…>`, `title?: ReactNode`, `header?: ReactNode`, `className?`, `children`
- Fallback `@supports not (backdrop-filter: blur(1px))` → `var(--glass-bg-strong)`

### SectionHeader — F1 (showcase)
- **TSX:** `SectionHeader.tsx` (Server) · **CSS:** `section-header.css`
- **Classes:** `mg-section-header`, `mg-section-header__icon`, `mg-section-header__title`
- Pílula dourada com `--gold-gradient`, texto em label (maiúsculas, tracking largo)
- **Props:** `title: string`, `icon?: MagicIconName`, `as?: 'h2' | 'h3'`

### MagicIcon — F1
- **TSX:** `MagicIcon.tsx` (Server, sem estado) · **CSS:** `magic-icon.css`
- **Classes:** `mg-magic-icon`, `mg-magic-icon--sm | --md | --lg | --xl` (24 / 40 / 56 / 120 px), `mg-magic-icon--placeholder`, `mg-magic-icon--glyph`, `mg-magic-icon__img`, `mg-magic-icon__svg`
- **Props:** `name: MagicIconName`, `size?: 'sm' | 'md' | 'lg' | 'xl'`, `decorative?: boolean`, `label?: string` (obrigatório se `decorative = false`), `className?`
- `ready: true` → `next/image` com `/icons/magic/<name>.png`; glifos prontos usam `mask-image` para herdar a cor
- `ready: false` → fallback (lucide ou glifo SVG) em `--gold-500` / `--gold-300` (escuro), `strokeWidth` 1.5, com halo radial dourado
- Registo em `src/lib/icons.ts`, tabela em `docs/ICONS.md`. **Nenhum componente usa lucide directamente para ícones mágicos.**

### Glyphs — F1
- **TSX:** `glyphs/MoonPhaseGlyph.tsx` (SVG desenhado por código), `glyphs/ZodiacGlyph.tsx` (carácter ♈…♓ + `︎`)
- Usados apenas como fallback de `MagicIcon` para `phase-*` e `sign-*`

### IconBadge — F1
- **TSX:** `IconBadge.tsx` (Server) · **CSS:** `icon-badge.css`
- **Classes:** `mg-icon-badge`, `mg-icon-badge--sm | --md | --lg`
- Círculo de vidro com contorno dourado que envolve um `MagicIcon` ou um ícone de linha
- **Props:** `size?: 'sm' | 'md' | 'lg'`, `children`, `className?`

### Button — F1
- **TSX:** `Button.tsx` (Server-compatible; sem estado) · **CSS:** `button.css`
- **Classes:** `mg-btn`, `mg-btn--primary` (gradiente dourado), `mg-btn--ghost`, `mg-btn--subtle`, `mg-btn--block`, `mg-btn--loading`, `mg-btn__spinner`, `mg-btn__label`
- **Props:** `variant?: 'primary' | 'ghost' | 'subtle' | 'danger'`, `block?: boolean`, `loading?: boolean`, `loadingLabel?: string` + atributos nativos de `<button>`
- **F9:** `mg-btn--danger` (vermelho, para acções destrutivas: apagar conta)

### Field — F1
- **TSX:** `Field.tsx` (Server) · **CSS:** `field.css`
- **Classes:** `mg-field`, `mg-field__label`, `mg-field__hint`, `mg-field__error`, `mg-field--inline`
- **Props:** `id: string`, `label: string`, `hint?: string`, `error?: string`, `children` (o controlo; recebe `aria-describedby` via props do chamador)

### TextInput — F1
- **TSX:** `TextInput.tsx` (Server-compatible) · **CSS:** `input.css`
- **Classes:** `mg-input`, `mg-input--error`; `mg-select` para `<select>` nativo
- **Props:** atributos nativos de `<input>` + `invalid?: boolean`

### LinedTextArea — F1 (showcase)
- **TSX:** `LinedTextArea.tsx` · **CSS:** `lined.css`
- **Classes:** `mg-lined`
- Textarea com linhas pautadas de caderno (gradiente repetido alinhado ao `line-height`)
- **Props:** `rows?: number` + atributos nativos de `<textarea>`

### SegmentedControl — F1
- **TSX:** `SegmentedControl.tsx` (`'use client'`) · **CSS:** `segmented.css`
- **Classes:** `mg-segmented`, `mg-segmented__option`, `mg-segmented__option--active`, `mg-segmented__input`
- `radiogroup` com inputs `radio` nativos (teclado ← → grátis)
- **Props:** `name`, `legend`, `options: { value, label }[]`, `value`, `onChange?`, `defaultValue?`
- Usado em tema e língua (3 opções cada)

### Autocomplete — F1
- **TSX:** `Autocomplete.tsx` (`'use client'`) · **CSS:** `autocomplete.css`
- **Classes:** `mg-autocomplete`, `mg-autocomplete__list`, `mg-autocomplete__option`, `mg-autocomplete__option--active`, `mg-autocomplete__status`
- Padrão ARIA combobox; debounce 300 ms; teclado ↑ ↓ Enter Esc
- **Props:** `id`, `label`, `fetchOptions(q) → Promise<T[]>`, `getOptionLabel(T)`, `getOptionKey(T)`, `onSelect(T)`, `minChars?` (2), `placeholder?`, `emptyLabel`, `loadingLabel`, `error?`, `defaultValue?`

### CheckTile — F2 (showcase F1)
- **TSX:** `CheckTile.tsx` (`'use client'`) · **CSS:** `check-tile.css`
- **Classes:** `mg-check-tile`, `mg-check-tile__icon`, `mg-check-tile__label`, `mg-check-tile__input`, `mg-check-tile__text`, `mg-check-tile__check`, `mg-check-tile--checked`
- Ícone + label + check; `withText` acrescenta input de texto (banimento: nome + check)
- **Props:** `icon: MagicIconName`, `label`, `checked`, `onCheckedChange`, `withText?`, `text?`, `onTextChange?`, `textLabel?`, `textPlaceholder?`

### CheckChip — F2 (showcase F1)
- **TSX:** `CheckChip.tsx` (`'use client'`) · **CSS:** `check-chip.css`
- **Classes:** `mg-check-chip`, `mg-check-chip__input`, `mg-check-chip__box`, `mg-check-chip__label`, `mg-check-chip--checked`
- Check pequeno inline com ícone (alongamento, treino, água)
- **Props:** `icon: MagicIconName`, `label`, `checked`, `onCheckedChange`

### MoodScale — F2 (showcase F1)
- **TSX:** `MoodScale.tsx` (`'use client'`) · **CSS:** `mood.css`
- **Classes:** `mg-mood`, `mg-mood__face`, `mg-mood__face--selected`, `mg-mood__input`
- 5 caras (`mood-1`…`mood-5`), valor 1–5, `radiogroup` acessível
- **Props:** `name`, `legend`, `labels: [string ×5]`, `value: number | null`, `onChange`

### MoonPhaseStrip — F2
- **TSX:** `MoonPhaseStrip.tsx` (Server) · **CSS:** `moon-strip.css`
- **Classes:** `mg-moon-strip`, `mg-moon-strip__phase`, `mg-moon-strip__phase--active`
- 8 fases (`phase-*`) como lista; cada glifo com `aria-label`; o activo tem halo dourado (`--shadow-glow`) e `aria-current`
- **Props:** `phase: MoonPhase`, `labels: Record<MoonPhase, string>`, `label` (nome da lista)

### ZodiacStrip — F2
- **TSX:** `ZodiacStrip.tsx` (Server) · **CSS:** `zodiac-strip.css`
- **Classes:** `mg-zodiac-strip`, `mg-zodiac-strip__sign`, `mg-zodiac-strip__sign--active`
- 12 signos (`sign-*`), destaca o signo da lua. **Props:** `sign: ZodiacSign`, `labels: Record<ZodiacSign, string>`, `label`

### DateBadge — F2
- **TSX:** `DateBadge.tsx` (Server) · **CSS:** `date-badge.css`
- **Classes:** `mg-date-badge`, `mg-date-badge__text`
- `MagicIcon name="calendar"` + `dd / mm / aaaa` (a partir de `DateISO`, sem conversão de fuso). **Props:** `date: DateISO`, `label`

### DayProgressDots — F3
- **TSX:** `DayProgressDots.tsx` (Server) · **CSS:** `progress-dots.css`
- **Classes:** `mg-progress-dots`, `mg-progress-dots--sm`, `mg-progress-dots__dot`, `mg-progress-dots__dot--done`
- 3 pontos (manhã, corpo, noite) a partir de `DayProgress`; `aria-label` com o estado; com `href` vira link para o dia
- **Props:** `progress: DayProgress`, `label: string`, `href?: string`, `size?: 'sm' | 'md'`

### WeightInput — F3
- **TSX:** `WeightInput.tsx` (`'use client'`) · **CSS:** `weight.css`
- **Classes:** `mg-weight-input`, `mg-weight-input__field`, `mg-weight-input__unit`
- `inputMode="decimal"`, aceita vírgula ou ponto; valida com `parseKgToGrams` no blur e mostra erro inline (via `Field`)
- **Props:** `id`, `grams: number | null`, `locale`, `onCommit(grams | null)`, `unitLabel`, `errorLabel`, `label`

### ProgressBar — F5
- **TSX:** `ProgressBar.tsx` (Server) · **CSS:** `progress.css`
- **Classes:** `mg-progress`, `mg-progress__fill`
- `role="progressbar"` com `aria-valuenow/min/max` e `aria-label`; largura do preenchimento em SVG (sem cor literal)
- Glow até ao próximo nível. **Props:** `value`, `max`, `label`

### Toast — F1
- **TSX:** `Toast.tsx` (`'use client'`) · **CSS:** `toast.css`
- **Classes:** `mg-toast`, `mg-toast--success`, `mg-toast--error`, `mg-toast__message`, `mg-toast__close`
- `role="status"` (success) / `role="alert"` (error); fecha automaticamente após 5 s
- **Props:** `variant: 'success' | 'error'`, `message`, `closeLabel`, `onClose?`

### Motto — F1
- **TSX:** `Motto.tsx` (Server) · **CSS:** `motto.css`
- **Classes:** `mg-motto`, `mg-motto__star`, `mg-motto__text`
- Rodapé decorativo com estrelas. **Props:** `text: string`

---

## Shell (`src/components/shell/`, CSS em `shell.css`)

### AmbientBackground — F1
- **TSX:** `AmbientBackground.tsx` (Server)
- **Classes:** `mg-ambient`, `mg-ambient__orb`, `mg-ambient__orb--1 … --4`
- 4 orbes dourados desfocados, animação lenta (40–60 s); parado com `prefers-reduced-motion`
- `aria-hidden`, `position: fixed`, atrás de tudo

### AppShell — F1
- **TSX:** `AppShell.tsx` (Server) · **Classes:** `mg-shell`, `mg-shell__main`
- Contentor com safe-area insets (PWA). Reserva espaço para a `BottomNav` (mobile) ou rail (desktop)

### TopBar — F1
- **TSX:** `TopBar.tsx` (Server) · **Classes:** `mg-topbar`, `mg-topbar__logo`, `mg-topbar__mark`, `mg-topbar__actions`
- Logo MYGLOW à esquerda; à direita o sino e o avatar (F8: `LevelBadge` com iniciais no anel de nível, abre `/profile`; o link antigo para definições saiu)
- **Props:** `appName`, `homeLabel`, `badge?` (avatar), `bell?` (F7: `NotificationBell`)

### BottomNav — F1
- **TSX:** `BottomNav.tsx` (`'use client'` — usa `usePathname`) · **Classes:** `mg-bottom-nav`, `mg-bottom-nav__item`, `mg-bottom-nav__item--active`, `mg-bottom-nav__icon`, `mg-bottom-nav__label`
- Hoje · Semana · Mês · Ano · Grimório (F8; o Perfil passou para o avatar da TopBar); mobile-first, ≥ 960 px vira rail lateral
- **Props:** `labels: Record<'today' | 'week' | 'month' | 'year' | 'grimoire', string>`, `ariaLabel`

### PageHeader — F1
- **TSX:** `PageHeader.tsx` (Server) · **Classes:** `mg-page-header`, `mg-page-header__eyebrow`, `mg-page-header__title`, `mg-page-header__subtitle`
- Título em Cormorant + subtítulo. **Props:** `title`, `subtitle?`, `eyebrow?`

### ComingSoon — F1
- **TSX:** `ComingSoon.tsx` (Server) · **CSS:** reutiliza `card.css` / `icon-badge.css`
- `GlassCard` "Em breve" + `IconBadge` com `MagicIcon`; usado nas páginas placeholder
- **Props:** `icon: MagicIconName`

### Layouts auxiliares (classes em `shell.css`)
- `mg-auth`, `__brand`, `__wordmark`, `__title`, `__tagline`, `__card`, `__card--wide`, `__footer` — layout central de login/registo/onboarding
- `mg-steps`, `__dot`, `__dot--active` — indicador de passos do onboarding
- `mg-form-actions` — linha de botões Voltar / Seguinte
- `mg-dl` — lista de definição (dados de nascimento, conta)
- `mg-dev`, `__grid`, `__caption` — página `/dev/ui`

---

## Formulários (`src/components/forms/`, todos `'use client'`)

Compõem primitivos; não têm CSS próprio além de `field.css` (`mg-form-error`, `mg-checkbox`).

| Componente | Usa | Acção |
|---|---|---|
| `LoginForm` | `Field`, `TextInput`, `Button` | `login` (useFormState); F9: link "Esqueceste-te da palavra-passe?" |
| `RegisterForm` | `Field`, `TextInput`, `SegmentedControl`, `Button` | `register` (useFormState); F9: caixas obrigatórias Termos + Política (links) e consentimento de bem-estar (`mg-checkbox--top`) |
| `OnboardingForm` | `Field`, `TextInput`, `Autocomplete`, `Button` | `saveBirthProfile` → `update({})` → `/today`; F9: menos de 16 anos → `UnderageNotice` (não continua) |
| `SettingsForm` | `Field`, `TextInput`, `SegmentedControl`, `Toast`, `Button` | `saveSettings` → `setTheme` → `update({})` → `router.refresh()`; F6: pronomes (Ela / Ele / Neutro); F9: `part` — `profile` (nome, pronomes) ou `preferences` (língua, tema, fuso, sono, hemisfério), cada um grava só os seus campos; a nota de privacidade das leituras passou para a secção Privacidade |
| `UiShowcase` (`src/components/dev/`) | todos os primitivos F1 | — |

---

## Providers (`src/components/providers/`)

| Componente | Tipo | Função |
|---|---|---|
| `ThemeProvider` | client | `next-themes` com `attribute="data-theme"`, `defaultTheme="light"`, `enableSystem` |
| `ThemeSync` | client | ao montar, aplica o `theme` da sessão se for diferente do actual |
| `ServiceWorkerRegister` | client | regista `/sw.js` apenas em produção |
| `AuthSessionProvider` | client | `SessionProvider` do Auth.js — dá `useSession().update()` aos formulários |

---

## Compostos por feature (só documentados)

### Diário — F2 (`src/components/day/`)

Mobile: coluna única pela ordem abaixo. ≥ 768 px: grelha de 2 colunas que espelha o diário em papel
(Manhã | Como me senti; Noite | Gratidão + Humor; restantes a toda a largura).

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `DayPage` | server | — | — | carrega utilizador, entrada, mapa natal e céu; compõe a página |
| `DayNav` | client | `day-nav.css` | `mg-day-nav`, `__btn`, `__btn--disabled`, `__label`, `__today` | ← data longa → (`<Link>`); botão "Hoje" quando não é hoje; → desactivado em hoje |
| `DailyHeader` | server | `daily-header.css` | `mg-daily-header`, `__strips`, `__date` | `MoonPhaseStrip` + `ZodiacStrip` (signo da lua ao meio-dia) + `DateBadge` |
| `DailySkyCard` | server | `sky-card.css` | `mg-sky-card`, `__section`, `__heading`, `__row`, `__label`, `__value`, `__note`, `__you` | **O céu hoje:** Sol, Lua (signo · fase · iluminação), ingresso/evento com hora local. **Tu:** Sol, Lua, Ascendente natais (convite para a hora se faltar; "incerta" se `moonSignUncertain`). O horóscopo segue no `DailyReadingCard` (F6) |
| `DayView` | client | `day.css` | `mg-day`, `__grid`, `__cell--*` | `useDailyAutosave` + cartões interactivos + `SaveStatus` + `Toast` de erro |
| `IntentionCard` | client | `day.css` | `mg-intention`, `__head` | `MagicIcon sparkles` + "Intenção do dia" + `LinedTextArea` (3); F6: `suggestion?` → placeholder + botão "Usar sugestão" (`__use`) |
| `MorningSection` | client | `period.css` | `mg-period`, `--morning`, `--current` | `SectionHeader(sun)` + banimento (`CheckTile withText`, tea-cup; F6: placeholder = `banishSuggestion`) + ritual (lotus) + sono (bed, "{h}h de sono") |
| `WakeMoodCard` | client | `day.css` | `mg-wake` | "Como me senti ao acordar?" + `MoodScale` + `TextInput` de nota |
| `BodyFocusBar` | client | `body-bar.css` | `mg-body-bar`, `__label`, `__chips`, `--current` | "Foco no meu corpo" + 3 × `CheckChip` (stretch, dumbbell, water-drop) |
| `NightSection` | client | `period.css` | `mg-period`, `--night`, `--current` | `SectionHeader(moon-crescent)` + banimento (feather) + ritual (crystal-ball) |
| `GratitudeMoodCard` | client | `day.css` | `mg-gratitude`, `__block` | gratidão (heart + `LinedTextArea` 3) + humor (thermometer + `MoodScale`) |
| `ReflectionCard` | client | `reflection.css` | `mg-reflection`, `__body`, `__head`, `__subtitle`, `__crystal` | moon-stars + "Reflexão final" + `LinedTextArea` 3 + cristal `xl` (oculto < 480 px); F6: `hint?` = `reflectionQuestion` em vez do subtítulo fixo |
| `DaySummaryCard` | client | `reflection.css` | `mg-reflection`, `mg-reflection--summary` | journal + "Resumo do meu dia" + `LinedTextArea` 4 + cristal |
| `SaveStatus` | client | `save-status.css` | `mg-save-status`, `--saving`, `--saved`, `--offline`, `--error` | indicador fixo por baixo da `TopBar`, `aria-live="polite"` |

`--current` (só em "hoje", no período dado por `getDayPeriod`): borda `--gold-500` + `--shadow-glow` subtil.

O texto IA do dia vive no `DailyReadingCard` (F6), logo a seguir ao `DailySkyCard`.

### Semana — F3 (`src/components/week/`)

Referência: página "Semana" do diário em papel. Mobile em coluna (título, intenção, céu, 7 dias, peso, projectos, reflexão).
≥ 768 px: título, intenção e dias a toda a largura; peso (1/3) + projectos (2/3) lado a lado; reflexão a toda a largura.

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `WeekPage` | server | — | — | carrega `getWeekPageData`, compõe a página |
| `WeekNav` | server | `week-nav.css` | `mg-week-nav`, `__btn`, `__btn--disabled`, `__center`, `__label`, `__links`, `__link` | ← → entre semanas, intervalo "3–9 mai 2026", "Esta semana" quando não é a actual, link para o mês |
| `WeekView` | client | `week.css` | `mg-week`, `__grid`, `__cell--*` | `useWeekAutosave` + cartões interactivos + `SaveStatus` + `Toast` de erro |
| `WeekTitleCard` | client | `week-title.css` | `mg-week-title`, `__label`, `__input` | faixa com `moon-crescent` e `sun`; input sem borda; placeholder "Semana {n} · {mês}" |
| `PeriodIntentionCard` | client | `day.css` | `mg-intention` | ver "Cartões de período" — "Intenção da semana" |
| `WeekSkyCard` | server | `week-sky.css` | `mg-week-sky`, `__title`, `__list`, `__event`, `__when` | eventos lunares da semana (glifo + "Lua Cheia em Escorpião · ter, 18:23"); sem eventos: fase dominante |
| `WeekDayRow` | client | `week-day.css` | `mg-week-day`, `__icon`, `__label`, `__date`, `__moon`, `__text`, `__progress`, `--today`, `--future` | ícone planetário do dia, abreviatura, número, glifo da lua, `LinedTextArea` 2, `DayProgressDots` com link (não em futuros) |
| `WeightCard` | client | `weight.css` | `mg-weight`, `__head`, `__input`, `__unit`, `__delta` | `scale` + "Meu peso da semana" + `WeightInput` + delta face à semana anterior (neutro, sem cor de bom/mau) |
| `PeriodProjectsCard` | client | `projects.css` | `mg-projects` | ver "Cartões de período" — "Intenções por projectos", grelha 3+2 |
| `PeriodReflectionCard` | client | `reflection.css` | `mg-reflection` | ver "Cartões de período" — "Reflexão da semana" |

Ícones planetários dos dias: dom `sun`, seg `moon-crescent`, ter `planet-mars`, qua `planet-mercury`, qui `planet-jupiter`, sex `planet-venus`, sáb `planet-saturn`.

### Cartões de período — F4 (`src/components/period/`)

Partilhados por semana, mês e ano. Os três primeiros substituem `WeekIntentionCard`, `ProjectIntentionsGrid` e `WeekReflectionCard` (a semana fica visualmente igual).

| Componente | Tipo | CSS | Classes | Props / conteúdo |
|---|---|---|---|---|
| `PeriodIntentionCard` | client | `day.css` | `mg-intention`, `__head`, `__label` | `{ id; label; placeholder?; value; onChange; onBlur; rows? }` — sparkles + label + `LinedTextArea` |
| `PeriodProjectsCard` | client | `projects.css` | `mg-projects`, `mg-projects--compact`, `__header`, `__grid` | `{ title; values: Record<ProjectArea,string>; onChange; onBlur; compact?; idPrefix? }` — 5 áreas, 3+2 ou coluna única (`compact`) |
| `ProjectIntentionCard` | client | `projects.css` | `mg-project`, `__head`, `__icon`, `__label`, `__text` | ícone da área (MAGIC `cauldron`, PERSONAL `heart`, LEISURE `lotus`, PROFESSIONAL `briefcase`, STUDIES `book-open`; mapa em `lib/icons.ts`) + `LinedTextArea`; F6: `note?` (`__note`) com o foco sugerido pela leitura da semana |
| `PeriodReflectionCard` | client | `reflection.css` | `mg-reflection` | `{ id; label; hint?; placeholder?; value; onChange; onBlur; rows? }` — moon-stars + `LinedTextArea` + crystal-cluster |
| `PeriodStatsCard` | server | `stats.css` | `mg-stats`, `__grid`, `__stat`, `__value`, `__label`, `__habits`, `__habit`, `__bar`, `__bar-track`, `__bar-fill`, `__weight`, `__spark` | dias registados/completos, sequência actual/melhor, humor médio (com `mood-N`), hábitos em barras SVG `done/of`, peso primeiro → último + sparkline SVG (sem cores de bom/mau) |
| `SkyEventsCard` | server | `sky-events.css` | `mg-sky-events`, `__item`, `__icon`, `__text`, `__when`, `--moon`, `--eclipse`, `--sabbat`, `--season`, `--station`, `--ingress` | lista cronológica do céu com glifo/ícone por tipo e data + hora no fuso do utilizador |
| `RetrogradesCard` | server | `retro.css` | `mg-retro`, `__item`, `__range`, `__sign`, `__now`, `--active` | "Mercúrio retrógrado · 30 jun → 24 jul · em Caranguejo"; destaca o activo hoje; vazio: "Sem retrógrados neste período" |

Ícones do céu: fases → `phase-*`; eclipse lunar `phase-full`, solar `sun`; ingresso do Sol → `sign-*`; estação do ano `sun`; sabbat `candle`; estação planetária → `planet-mercury` / `planet-venus` / `planet-mars`.

### Mês — planner F4 (`src/components/month/`)

Ordem (coluna no telemóvel; pares `|` lado a lado ≥ 1024 px):
`MonthNav` → `MonthHeroCard` → `PeriodIntentionCard` | `PeriodProjectsCard compact` → `MonthCalendar` → `SkyEventsCard` | `RetrogradesCard` → `MonthWeeksList` → `PeriodStatsCard` (oculto em meses futuros) → `MonthReadingCard` → `RitualsCard` → `PeriodReflectionCard` → `Motto`

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `MonthPlannerPage` | server | — | — | carrega `getMonthPageData`, compõe a página |
| `MonthPlanView` | client | `month.css` | `mg-month`, `__grid`, `__pair`, `__cell` | `useMonthAutosave` + cartões de período; cartões server entram como slots |
| `MonthNav` | server | `month-nav.css` | `mg-month-nav`, `__btn`, `__btn--disabled`, `__center`, `__label`, `__links`, `__today` | ← → meses, "Maio de 2026", "Este mês", link para o ano |
| `MonthHeroCard` | server | `hero.css` | `mg-hero`, `__title`, `__sub`, `__moon` | mês em Cormorant; "Sol em Touro → Gémeos a 21"; lua de hoje no mês actual |
| `MonthCalendar` | server | `calendar.css` | `mg-calendar`, `__head`, `__row`, `__week`, `__cell`, `__num`, `__moon`, `__event`, `--today`, `--future`, `--out`, `--empty`, `--partial`, `--complete` | grelha dom→sáb; número, glifo da lua, `DayProgressDots` pequeno; ponto dourado `__event` (com `title`) em dias com eclipse, sabbat, estação ou estação planetária |
| `MonthWeeksList` | server | `month-weeks.css` | `mg-month-weeks`, `__item`, `__title`, `__intention`, `__count` | um item por domingo: título, 1.ª linha da intenção, "4/7 dias"; liga à semana |

### Ano — planner F4 (`src/components/year/`)

Ordem: `YearNav` → `YearWordCard` → `PeriodIntentionCard` | `PeriodProjectsCard compact` → `YearGrid` → `WheelOfYearCard` → `RetrogradesCard` → `YearMoodCard` → `PeriodStatsCard` → `PeriodReflectionCard` → `Motto`

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `YearPlannerPage` | server | — | — | carrega `getYearPageData`, compõe a página |
| `YearPlanView` | client | `year.css` | `mg-year`, `__grid`, `__pair`, `__cell` | `useYearAutosave` + cartões de período; cartões server como slots |
| `YearNav` | server | `year-nav.css` | `mg-year-nav`, `__btn`, `__btn--disabled`, `__center`, `__label`, `__today` | ← → anos, "Este ano" |
| `YearWordCard` | client | `year-word.css` | `mg-year-word`, `__label`, `__input` | `MagicIcon scroll` + input grande centrado; placeholder "Uma palavra que te guie" |
| `YearGrid` | server | `year-grid.css` | `mg-year-grid` | 3×4 (≥ 1024) / 2×6 (≥ 600) / 1 coluna |
| `YearMonthTile` | server | `year-month.css` | `mg-year-month`, `__name`, `__intention`, `__mini`, `__dot`, `__count`, `--current`, `--future` | nome, 1.ª linha da intenção, mini-calendário de pontos (opacidade: vazio .15, parcial .5, completo 1), "12/31 completos"; liga ao mês |
| `WheelOfYearCard` | server | `wheel.css` | `mg-wheel`, `__list`, `__item`, `__name`, `__sub`, `__when`, `__eclipses`, `--next`, `--past` | 8 sabbats + 4 estações por ordem cronológica, próximo destacado; eclipses do ano |
| `YearMoodCard` | server | `year-mood.css` | `mg-year-mood`, `__chart`, `__bar`, `__bar--empty`, `__label`, `__legend` | 12 barras SVG finas (humor médio) + dias completos; `<title>`/`aria-label` por barra |

### Glow — F5 (`src/components/glow/`)

Os pontos chamam-se **Glow** na UI (no código: `xp`). Lógica em `src/lib/xp/`.

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `GlowProvider` | client | — | — | contexto no layout `(app)`: `useGlow().push(xp)` enfileira toasts, abre `LevelUpDialog` (também ao carregar se `level > levelSeen`) e faz `router.refresh()` para actualizar badge e notas |
| `GlowToast` | client | `glow-toast.css` | `mg-glow-toast`, `__icon`, `__points`, `__label` | "+15 Glow · Noite completa" com `glow-orb`; awards simultâneos num só toast ("+50 Glow · Dia completo ✦"); 3 s; `aria-live="polite"`; por baixo do `SaveStatus` |
| `LevelUpDialog` | client | `levelup.css` | `mg-levelup`, `__icon`, `__title`, `__text`, `__actions` | `<dialog>` modal nativo (foco preso, Esc fecha) com `level-N` `xl`, "Subiste para Chama" + frase do nível; brilho suave (sem animação com `prefers-reduced-motion`); ao fechar chama `markLevelSeen` |
| `LevelBadge` | server | `level-badge.css` | `mg-level-badge`, `--active`, `__ring`, `__track`, `__arc`, `__initials` | na `TopBar`: F8 avatar — iniciais do nome dentro do anel SVG de progresso do nível; `aria-label` "Perfil · …"; liga a `/profile` (activo em `/profile` e `/settings`) |
| `GlowWindowNote` | server | `glow-note.css` | `mg-glow-note`, `__item`, `--open`, `--closed`, `--earned`, `--upcoming` | dia: "Glow de hoje 35/50" / "ainda conta até hoje às 23:59" / "já não conta, mas continua teu"; semana/mês/ano: estado do plano e da reflexão (a partir de `windowState`) |

### Jornada — F5 (`src/components/journey/`, página `/profile`)

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `JourneyPage` | server | `journey.css` | `mg-journey`, `__summary`, `__total`, `__gear` | total de Glow, nível, cartões abaixo (F8: `BadgesCard`) e roda dentada para Definições no topo |
| `LevelPathCard` | server | `level-path.css` | `mg-level-path`, `__step`, `__icon`, `__name`, `__min`, `--done`, `--current`, `--locked` | 7 níveis com ícone, nome e Glow mínimo; o actual com `ProgressBar` |
| `StreakCard` | server | `streak.css` | `mg-streak`, `__value`, `__best`, `__next` | `flame` + streak mágico actual e melhor; próximo marco; streak 0 → "Cada dia é um recomeço" |
| `GlowHistoryCard` | server | `glow-history.css` | `mg-glow-history`, `__item`, `__label`, `__date`, `__points` | últimos 30 eventos do ledger com data e rótulo |

### Grimório IA — F6 (`src/components/reading/`)

Conteúdo gerado em Inngest e só lido da DB (`lib/ai/queries.ts`). Em falta num período aberto → `ReadingPending`; passado ou sem mapa → "indisponível" (ou nada, se não houver mapa natal).
Dia: `DailySkyCard` → `DailyReadingCard` → `RitualTodayCard` (se houver). Semana: `WeekReadingCard` a seguir ao céu da semana. Mês: ver ordem acima.

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `DailyReadingCard` | server | `reading.css` | `mg-reading`, `__section`, `__heading`, `__headline`, `__text`, `__personal`, `__keywords`, `__crystal`, `__transits`, `__chip`, `__symbol`, `__meaning`, `__aspect-name`, `__label`, `__disclaimer`, `--pending` | Só **Para ti** (desde a v3 o horóscopo do signo saiu do dia): título poético, leitura, 3 palavras-chave, cristal do dia (`MagicIcon crystal-cluster` sm), até 3 chips de trânsito `<details>` em frase simples ("Saturno em tensão com o teu Ascendente" + símbolo); ao tocar, o significado e o nome técnico discreto. Rodapé "Para inspiração e reflexão." |
| `ReadingPending` | client | `reading.css` | `mg-reading__pending`, `__shimmer`, `__line`, `__pending-text` (o cartão todo por preparar leva `mg-reading--pending`) | shimmer dourado suave (estático com reduced-motion) + "A tua leitura está a ser preparada"; ao montar chama `requestAiContent` para cada pedido e `router.refresh()` a cada 10 s durante 1 min (depois: "volta daqui a pouco") |
| `RitualTodayCard` | server | `ritual-today.css` | `mg-ritual-today`, `__icon`, `__body`, `__title`, `__meta` | ritual do mês nesta data: `candle`, título, ocasião · duração, botão "Ver ritual" (`RitualSheet`) |
| `WeekReadingCard` | server | `reading.css` | `mg-reading`, `__section`, `__focus` | só a leitura pessoal da semana + áreas de foco (também como nota no `ProjectIntentionCard`); a energia por signo ficou só no mês |
| `MonthReadingCard` | server | `reading.css` | `mg-reading`, `__section`, `__highlights`, `__date`, `__focus` | energia do mês + leitura pessoal + datas-chave + áreas de foco |
| `PeriodReadingCard` | server | `reading.css` | `mg-reading`, `__section`, `__highlights`, `__focus` | base partilhada de `WeekReadingCard` e `MonthReadingCard` (`{ id; title; signTitle; personalTitle; datesTitle; sign; personal; pending }`) |
| `RitualsCard` | server | `rituals.css` | `mg-rituals`, `__list`, `__item`, `__date`, `__body`, `__title`, `__meta`, `__icon` | 3–5 rituais: data, ocasião, ícone da área, duração; cada item abre o `RitualSheet` |
| `RitualSheet` | client | `ritual-sheet.css` | `mg-ritual-sheet`, `__trigger`, `__head`, `__title`, `__meta`, `__intention`, `__label`, `__materials`, `__steps`, `__safety`, `__actions`, `__status` | `<dialog>` modal nativo (foco preso, Esc fecha): intenção, materiais, passos numerados, nota de segurança destacada (`candle`); **"Adicionar à minha semana"** → `addRitualToWeek` |

### Notificações — F7 (`src/components/notifications/`)

Lembretes push (`web-push`) + caixa de avisos na app (funciona sem push). A permissão só é pedida depois de tocar em "Activar".

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `NotificationBell` | server | `bell.css` | `mg-bell`, `__count` | na `TopBar`: carrega `getInbox` + `getUnreadCount` e renderiza `NotificationInbox` |
| `NotificationInbox` | client | `bell.css`, `inbox.css` | `mg-bell` (botão, sino lucide + contagem "9+"), `mg-inbox`, `__head`, `__list`, `__item`, `__title`, `__body`, `__time`, `__dot`, `--unread`, `__empty`, `__actions` | `<dialog>` com os últimos 30 avisos (título, corpo, "há 2 h" via `Intl.RelativeTimeFormat`); tocar marca como lido e navega; "Marcar tudo como lido"; vazio "Sem avisos por agora" |
| `NotificationsPromptCard` | client | `notify-prompt.css` | `mg-notify-prompt`, `__icon`, `__body`, `__title`, `__text`, `__actions`, `__status` | em `/today` a partir do 2.º dia de uso: "Queres lembretes suaves…?" → "Activar" (`subscribePush`) / "Agora não" (cookie 14 dias); some se o dispositivo já estiver subscrito; iPhone fora da app instalada → `InstallGuide` |
| `InstallGuide` | client | `install.css` | `mg-install`, `__intro`, `__steps`, `__step`, `__num` | iPhone/iPad: Partilhar → "Adicionar ao ecrã principal" → abrir pelo ícone (ícones de linha lucide) + "No iPhone, os lembretes só funcionam com a app instalada." |
| `InstallButton` | client | `install-btn.css` | `mg-install-btn` | Android/desktop: guarda `beforeinstallprompt` e mostra "Instalar MYGLOW"; escondido em standalone ou sem o evento |
| `NotificationSettings` | client | `notify-settings.css` | `mg-notify-settings`, `__section`, `__row`, `__label`, `__time`, `__device`, `__devices`, `__status` | nas definições: interruptor geral; manhã/corpo/noite (interruptor + hora em passos de 15 min); semana e mês (início, fim, "Última chamada"); estado da permissão + Activar/Desactivar neste dispositivo; dispositivos com "Remover"; "Enviar notificação de teste"; `InstallButton`/`InstallGuide` |

### Grimório — F8 (`src/components/grimoire/`, rotas `/grimoire`, `/grimoire/[course]/[lesson]`, `/grimoire/[course]/quiz`)

Escola em trilha (estilo Duolingo). Conteúdo só em `content/grimoire/**` (JSON validado); regras em `src/lib/grimoire/`. Leitor e quiz em ecrã inteiro no grupo `(focus)` (sem `TopBar`/`BottomNav`).

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `GrimoireMap` | server | `map.css` | `mg-map`, `__notice`, `__regions` | medidor fixo + aviso (`?notice=`) + regiões; o nó actual faz scroll suave até si ao abrir |
| `DailyLessonsMeter` | server | `daily-meter.css` | `mg-daily-meter`, `__moons`, `__moon`, `--filled`, `__label`, `__badges` | topo fixo: 3 luas (lições novas de hoje) + contador de emblemas (liga ao perfil) |
| `CourseRegion` | server | `region.css` | `mg-region`, `__header`, `__icon`, `__title`, `__subtitle`, `__progress`, `__lock-note`, `__path`, `__line`, `__nodes`, `__row`, `__row--left/--center/--right`, `__deco`, `--locked`, `--completed` | cabeçalho em vidro (ícone, título, subtítulo, "3/6"); caminho em zigue-zague com traço SVG curvo pontilhado dourado; estrelas e luas decorativas |
| `LessonNode` | client | `node.css` | `mg-node`, `--completed`, `--current`, `--locked`, `__ring`, `__label` | 64 px (actual 80 px com halo pulsante, estático com reduced-motion); ✓ ou cadeado; abre `NodePopover` |
| `NodePopover` | client | `node-pop.css` | `mg-node-pop`, `__title`, `__meta`, `__text`, `__actions` | título, "4 min", **Começar** / **Rever**; limite diário; "conclui a anterior" |
| `QuizNode` | client | `node.css` | `mg-node`, `--quiz` | cristal (`crystal-cluster`); bloqueado até todas as lições |
| `BadgeNode` | server | `node.css` | `mg-node`, `--badge`, `--earned` | emblema do curso em silhueta até concluído, depois dourado |
| `Crossroads` | server | `crossroads.css` | `mg-crossroads`, `__title`, `__chips`, `__chip`, `--locked` | depois dos obrigatórios: "Escolhe o teu caminho" + chips dos cursos livres (saltam para a região); esbatido até concluir os obrigatórios |
| `ComingSoonGrimoire` | client | `coming-soon.css` | `mg-coming-soon`, `__title`, `__text` | EN sem conteúdo: "The Grimoire is coming soon in English" + "Read in Portuguese" (cookie) |
| `LessonPlayer` | client | `player.css` | `mg-player`, `__top`, `__close`, `__segments`, `__segment`, `__segment--done`, `__stage`, `__card`, `__nav` | segmentos (1 por card), fechar (confirma a meio), card ao centro; swipe (pointer, 60 px), setas, ← →; transição horizontal (fade com reduced-motion); chama `completeLesson` no fim |
| `ReviewCard` | client | `card-review.css` | `mg-card-review`, `__eyebrow`, `__prompt`, `__options`, `__option`, `--correct`, `--wrong`, `__explain` | "Lembras-te?" + pergunta; explicação depois de responder; só avança depois de responder |
| `ContentCard` | client | `lcard.css` | `mg-lcard`, `--concept/--icon/--example/--didyouknow/--reflection/--practice`, `__icon`, `__eyebrow`, `__title`, `__body`, `__input` | cada tipo de card; `**negrito**` via `parseInline`; reflexão com campo que não é gravado; prática só com texto (a acção fica no `LessonComplete`, para não sair a meio) |
| `LessonComplete` | client | `lesson-done.css` | `mg-lesson-done`, `__glow`, `__title`, `__moons`, `__practice`, `__label`, `__actions` | "Lição concluída", luas restantes hoje, acção da prática ("Para praticar": ex. abrir o diário), "Continuar" / "Voltar ao mapa" |
| `QuizPlayer` | client | `quiz.css` | `mg-quiz`, `__progress`, `__bar`, `__question`, `__options`, `__option`, `--correct`, `--wrong`, `__explain`, `__actions` | 5 perguntas, uma de cada vez, certo/errado + explicação sempre; no fim `submitQuiz` |
| `QuizResult` | client | `quiz-result.css` | `mg-quiz-result`, `__score`, `__text`, `__actions` | "4/5"; passou → `BadgeCeremony`; não → "Quase lá…" + tentar de novo |
| `BadgeCeremony` | client | `badge-cer.css` | `mg-badge-cer`, `__icon`, `__eyebrow`, `__name`, `__text`, `__glow`, `__actions` | `<dialog>` com o emblema `xl`, nome, descrição, "+100 Glow" (toast e subida de nível via `GlowProvider`) |
| `BadgesCard` (`journey/`) | server | `badges.css` | `mg-badges`, `__grid`, `__slot`, `--earned`, `__icon`, `__name`, `__date` | emblemas dos cursos publicados: dourados com data ou em silhueta com o nome do curso |

Navegação F8 (`ProfileAvatarLink`, client, em `glow/`: link do avatar activo em `/profile` e `/settings`): `BottomNav` Hoje · Semana · Mês · Ano · **Grimório** (activo em `/grimoire/*`); o Perfil abre pelo avatar (`LevelBadge` com iniciais dentro do anel de nível) na `TopBar`, activo em `/profile` e `/settings`; `/profile` tem o botão de definições (roda dentada).

### Novidades (`src/components/whats-new/`)

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `WhatsNewDialog` | client | `whats-new.css` | `mg-whats-new`, `__icon`, `__title`, `__subtitle`, `__list`, `__item`, `__link`, `__actions` | `<dialog>` "Novidades MYGLOW" no layout `(app)`, uma vez por novidade: lista simples (ícone + frase) de cursos novos do Grimório ("Curso «Rituais do cotidiano» já disponível no Grimório") e lançamentos de `content/whats-new.json`; fechar ou tocar num item marca tudo como visto |

### Conta, email e privacidade — F9 (`src/components/account/`, `settings/`, `legal/`)

Rotas novas: `(auth)/forgot-password`, `reset-password`, `verify-email`, `confirm-email-change` (abertas com ou sem sessão); `(public)/privacy`, `terms`, `goodbye` (sem login). Textos em `account`, `legal`, `settings` e `emails`.

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `VerifyEmailBanner` | server | `banner.css` | `mg-banner`, `--info`, `__icon`, `__text`, `__actions`, `__close` | no topo da app enquanto o email não está confirmado (escondido 3 dias ao fechar, cookie `mg_verify_banner`): "Confirma o teu email para poderes recuperar a conta." + `ResendVerificationButton` + fechar (`BannerDismiss`) |
| `BannerDismiss` | client | `banner.css` | `mg-banner__close` | grava o cookie e esconde o banner |
| `ResendVerificationButton` | client | `banner.css` | `mg-banner__status` | "Reenviar email" → `resendVerification`; mostra "Enviámos um novo email." ou o erro |
| `ForgotPasswordForm` | client | `auth-form.css` | `mg-auth-form`, `__intro`, `__sent`, `__links` | `/forgot-password`; depois de enviar mostra sempre "Se existir uma conta com este email, enviámos um link." |
| `ResetPasswordForm` | client | `auth-form.css` | `mg-auth-form`, `__links` | `/reset-password?token=`: nova palavra-passe; token inválido/expirado → mensagem + link para pedir novo; sucesso → link para entrar |
| `VerifyEmailResult` | server | `auth-result.css` | `mg-auth-result`, `--ok`, `--error`, `__icon`, `__title`, `__text`, `__actions` | `/verify-email?token=` → consome o token e mostra sucesso ou erro |
| `ConfirmEmailChangeResult` | server | `auth-result.css` | `mg-auth-result`, … | `/confirm-email-change?token=` → aplica o email novo; pede para entrar de novo |
| `SettingsNav` | client | `settings-nav.css` | `mg-settings-nav`, `__list`, `__item`, `--active` | índice das secções das definições (âncoras); no desktop fica fixo ao lado; secção visível marcada (IntersectionObserver) |
| `ChangeEmailForm` | client | `form.css` | `mg-form`, `__row`, `__status`, `--error` | email novo + palavra-passe actual → `requestEmailChange` ("Enviámos um link para o email novo.") |
| `ChangePasswordForm` | client | `form.css` | `mg-form`, … | palavra-passe actual + nova → `changePassword` (outros dispositivos saem; este continua) |
| `WellbeingConsentCard` | client | `form.css` | `mg-form`, `__status` | privacidade: data do consentimento; "Retirar" (aviso + opção de apagar humor, sono e peso já registados) ou "Dar consentimento" |
| `DeleteAccountDialog` | client | `danger.css` | `mg-danger`, `__text`, `__list`, `__confirm`, `__actions` | zona de perigo: explica o que é apagado (tudo, sem recuperação), sugere exportar antes; `<dialog>` com palavra-passe + escrever "APAGAR"/"DELETE"; botão `mg-btn--danger` |
| `PolicyUpdateDialog` | client | `policy-dialog.css` | `mg-policy-dialog`, `__title`, `__text`, `__links`, `__consent`, `__actions` | bloqueante no layout `(app)` quando a versão dos Termos/Política mudou (ou nunca foi aceite): resumo + links + "Aceitar"; sem consentimento de bem-estar mostra também a caixa (opcional) |
| `WellbeingNotice` | partilhado (sem estado) | `form.css` | `mg-wellbeing-off`, `__text`, `__link` | no diário e na semana, no lugar de humor/sono/peso sem consentimento: nota + link para voltar a consentir |
| `UnderageNotice` | client | `danger.css` | `mg-danger`, … | onboarding com menos de 16 anos: "A MYGLOW é para maiores de 16 anos." + `DeleteAccountDialog` |
| `LegalPage` | server | `legal.css` | `mg-legal`, `__meta`, `__draft`, `__body` | `/privacy` e `/terms`: `content/legal/<doc>/<locale>.md` com o parser mínimo (títulos `##`, listas, links, citações); Cormorant nos títulos, Jost no corpo, largura máxima 68ch; versão e data no topo |
| `AuthResult` | server | `auth-result.css` | `mg-auth-result`, … | bloco comum (ícone, título, texto, acções) de `VerifyEmailResult` e `ConfirmEmailChangeResult` |
| Layouts | server | `legal.css`, `settings-nav.css` | `mg-public`, `__header`, `__brand` · `mg-settings`, `__sections`, `__section` | grupo `(public)` (marca + "Voltar", sem login) · grelha das definições (índice + secções; 2 colunas a partir de 1024 px) |
| `GoodbyePage` (página) | server | `goodbye.css` | `mg-goodbye`, `__icon`, `__title`, `__text` | `/goodbye`: "A tua conta foi apagada. Obrigada por teres feito parte." + link para a página inicial |


### Beta, boas-vindas e página pública — F10 (`src/components/beta/`, `welcome/`, `landing/`)

Textos em `beta`, `feedback`, `welcome`, `firstSteps` e `landing`. O beta só aparece com `BETA=true`.

| Componente | Tipo | CSS | Classes | Conteúdo |
|---|---|---|---|---|
| `BetaBadge` | server | `beta-badge.css` | `mg-beta-badge` | pílula pequena "beta" ao lado do logo (`TopBar`, `LandingNav`) |
| `BetaNotice` | server | `beta-notice.css` | `mg-beta-notice`, `__icon`, `__text` | registo, por cima das caixas de consentimento: `sparkles` pequeno + texto secundário, sem caixa |
| `FeedbackDialog` | client | `feedback.css` | `mg-feedback`, `__dialog`, `__title`, `__form`, `__thanks`, `__actions`, `--link` | botão (ou link discreto `--link`) que abre um `<dialog>`: tipo (Problema · Ideia · Elogio · Outro, `SegmentedControl`), mensagem, enviar → `sendFeedback`; depois "Obrigada! Lemos tudo." |
| `WelcomeTour` | client | `welcome.css` | `mg-welcome`, `__skip`, `__slide`, `--active`, `__art`, `__title`, `__text`, `__dots`, `__dot`, `--current`, `__actions` | `/welcome`, ecrã inteiro: 4 slides (swipe, setas, teclado), pontos de progresso, "Saltar"; o último botão e "Saltar" → `markWelcomeSeen` → `/today` |
| `FirstStepsCard` | server | `first-steps.css` | `mg-first-steps`, `__list`, `__step`, `--done`, `__check`, `__link`, `__footer` | topo do `/today`: 4 passos com ✓ (intenção de hoje, primeira lição, plano da semana, lembretes/instalação); "Dispensar" (`dismissFirstSteps`) e "Rever a apresentação"; some quando tudo está feito |
| `LandingPage` | server | `landing.css` | `mg-landing`, `__section`, `__inner`, `--split`, `--reverse`, `__eyebrow`, `__title`, `__lead`, `__text`, `__note` | `/` sem sessão: compõe as secções abaixo (coluna única no telemóvel; texto/pré-visualização lado a lado a partir de 1024 px; máximo 1120 px) |
| `LandingNav` | server | `landing-nav.css` | `mg-landing-nav`, `__brand`, `__actions` | logo + `BetaBadge`, `LocaleSwitcher`, "Entrar" (ghost) e "Criar conta" (primary) |
| `Hero` | server | `landing-hero.css` | `mg-landing-hero`, `__copy`, `__title`, `__lead`, `__actions` | título, subtítulo, "Criar conta grátis" / "Já tenho conta" + `AppPreview today` |
| `Pillars` | server | `pillars.css` | `mg-pillars`, `__card`, `__icon`, `__title`, `__text` | Diário · Planner · Grimório |
| `DayRhythm` | server | `landing.css` | `mg-landing__steps`, `__step` | Manhã · Corpo · Noite + `AppPreview week` |
| `SkySection` | server | `landing.css` | `mg-landing__list` | Lua do dia, mapa natal, leituras pessoais, rituais do mês + nota "Para inspiração e reflexão." |
| `GrimoireSection` | server | `landing.css` | `mg-landing__list` | lições, 3 por dia, emblemas + `AppPreview grimoire` |
| `GlowSection` | server | `landing.css` | `mg-landing__levels`, `__level` | os 7 níveis (ícones `level-1…7`) + "Sem culpa: nunca perdes Glow." |
| `InstallSection` | server | `landing.css` | — | instalar no telemóvel + `InstallButton` + nota para iPhone |
| `Faq` | server | `faq.css` | `mg-faq`, `__item`, `__question`, `__answer` | acordeão `<details>` |
| `FinalCta` | server | `landing.css` | `mg-landing__cta` | "Começa hoje, com uma intenção." + botão + `Motto` |
| `LandingFooter` | server | `landing-footer.css` | `mg-landing-footer`, `__links` | "MYGLOW · um projecto Onda", Termos, Privacidade, contacto, `LocaleSwitcher` |
| `LocaleSwitcher` | client | `locale-switcher.css` | `mg-locale-switcher`, `__option`, `--active` | PT · BR · EN: grava o cookie `NEXT_LOCALE` e faz `router.refresh()` |
| `AppPreview` | server | `preview.css` | `mg-preview`, `__frame`, `__screen`, `__label` | moldura de telemóvel em CSS com markup estático (primitivos reais com dados de exemplo, `aria-hidden`, sem DB nem hooks): `today` (lua, intenção, 3 `CheckTile`, humor 4), `week` (dias com progresso), `grimoire` (região + 4 `LessonNode`) |

Integração F10: `TopBar` mostra `BetaBadge` junto ao logo; `/profile` ganhou `FeedbackDialog` e "Rever a apresentação" (`mg-journey__extras`); as definições têm `FeedbackDialog` na secção Privacidade; `/today` tem o link discreto de feedback por baixo do `Motto` (`mg-feedback__footer`); `IntentionCard` tem `id="intencao"` (âncora dos primeiros passos); `RegisterForm` aceita `betaNotice` e `invite`.
