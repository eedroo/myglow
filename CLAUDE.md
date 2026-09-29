# MYGLOW — instruções para o Claude Code

Lê `docs/DECISIONS.md` e `docs/COMPONENTS.md` antes de implementar qualquer coisa.

## Regras que nunca se quebram
- CSS: cada componente tem classes `mg-*` (BEM) em `src/styles/components/<nome>.css`. Inline style só para ajuste pontual numa instância. Sem Tailwind.
- Cores, espaços, raios, sombras: só `var(--…)` definidos em `src/styles/tokens.css` (tema claro e escuro).
- Antes de criar um componente novo, acrescenta-o a `docs/COMPONENTS.md`.
- Páginas são Server Components; `'use client'` só em componentes interactivos; Prisma nunca no cliente; mutações por Server Actions validadas com Zod.
- Datas de calendário são strings `YYYY-MM-DD` (`DateISO`) calculadas no fuso do utilizador; conversão para `Date` só com `toDbDate`/`fromDbDate` de `src/lib/dates.ts`.
- Semana começa ao domingo; lógica de semanas só em `src/lib/weeks.ts`.
- Peso em gramas inteiras; humor 1–5.
- Texto visível só em `messages/pt-PT.json`, `pt-BR.json`, `en.json`, escrito de forma nativa em cada língua.
- Ícones mágicos via `MagicIcon` (`src/lib/icons.ts`); lucide directo só para ícones de UI de linha.
- Alterações cirúrgicas: nunca reescrever ficheiros inteiros existentes.
- Commits: um commit único por fase, no fim, com `vitest`, `tsc --noEmit`, build e Playwright a passar (ex.: `feat(fase-4): planner mensal, anual e céu do grimório`).
- `docs/DECISIONS.md` é uma cópia: não mudar regras por iniciativa própria; só acrescentar o que o prompt da fase indicar.
