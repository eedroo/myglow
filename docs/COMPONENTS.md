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
- **Props:** `variant?: 'primary' | 'ghost' | 'subtle'`, `block?: boolean`, `loading?: boolean`, `loadingLabel?: string` + atributos nativos de `<button>`

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
- **Classes:** `mg-moon-strip`, `mg-moon-strip__phase`, `mg-moon-strip__phase--active`
- 8 fases (`phase-*`), destaca a actual. **Props:** `phase: MoonPhase`, `labels`

### ZodiacStrip — F2
- **Classes:** `mg-zodiac-strip`, `mg-zodiac-strip__sign`, `mg-zodiac-strip__sign--active`
- 12 signos (`sign-*`), destaca o signo da lua. **Props:** `sign: ZodiacSign`, `labels`

### DateBadge — F2
- **Classes:** `mg-date-badge`
- Ícone `calendar` + data formatada com `Intl.DateTimeFormat`. **Props:** `date: Date`, `locale`, `timeZone`

### ProgressBar — F5
- **Classes:** `mg-progress`, `mg-progress__fill`
- XP até ao próximo nível. **Props:** `value`, `max`, `label`

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
- **TSX:** `TopBar.tsx` (Server) · **Classes:** `mg-topbar`, `mg-topbar__logo`, `mg-topbar__mark`, `mg-topbar__settings`
- Logo MYGLOW + link para definições (avatar com inicial)
- **Props:** `userName: string`, `settingsLabel: string`

### BottomNav — F1
- **TSX:** `BottomNav.tsx` (`'use client'` — usa `usePathname`) · **Classes:** `mg-bottom-nav`, `mg-bottom-nav__item`, `mg-bottom-nav__item--active`, `mg-bottom-nav__icon`, `mg-bottom-nav__label`
- Hoje · Semana · Mês · Ano · Perfil; mobile-first, ≥ 960 px vira rail lateral
- **Props:** `labels: Record<'today' | 'week' | 'month' | 'year' | 'profile', string>`, `ariaLabel`

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
| `LoginForm` | `Field`, `TextInput`, `Button` | `login` (useFormState) |
| `RegisterForm` | `Field`, `TextInput`, `SegmentedControl`, `Button` | `register` (useFormState) |
| `OnboardingForm` | `Field`, `TextInput`, `Autocomplete`, `Button` | `saveBirthProfile` → `update({})` → `/today` |
| `SettingsForm` | `Field`, `TextInput`, `SegmentedControl`, `Toast`, `Button` | `saveSettings` → `setTheme` → `update({})` → `router.refresh()` |
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

### Diário — F2
| Componente | Composição |
|---|---|
| `DailyHeader` | `MoonPhaseStrip` + `ZodiacStrip` + `DateBadge` |
| `IntentionCard` | `GlassCard` + `LinedTextArea` + ícone `sparkles` |
| `MorningSection` | `SectionHeader("MANHÃ", sun)` + `CheckTile withText` (banimento) + `CheckTile` (ritual) + `CheckTile` (meta de sono) |
| `WakeMoodCard` | `MoodScale` + nota curta |
| `BodyFocusBar` | 3 × `CheckChip` (alongamento, treino, água) |
| `NightSection` | `SectionHeader("NOITE", moon-crescent)` + banimento + ritual |
| `GratitudeMoodCard` | `LinedTextArea` (gratidão) + `MoodScale` |
| `ReflectionCard` | `LinedTextArea` + cristal decorativo (`crystal-cluster`, `xl`) |
| `DaySummaryCard` | resumo do dia + `Motto` |
| `DailyAstroCard` (F6) | conteúdo IA do dia |

### Semana — F3
`WeekTitle`, `WeekIntentionCard`, `WeekDayRow`, `WeightCard`, `ProjectIntentionsGrid`, `ProjectIntentionCard`, `WeekReflectionCard`

### Mês / Ano — F4
`MonthHeader`, `LunarEventsCard`, `RitualSuggestionsCard` (F6), `MonthStatsCard`, `YearGrid`, `YearWordCard`

### Gamificação — F5
`LevelBadge`, `XpToast`, `StreakCounter`
