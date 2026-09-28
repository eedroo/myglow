/**
 * Gera docs/ICONS.md a partir de src/lib/icons.ts.
 * Uso: npm run docs:icons
 */
import { writeFileSync } from 'node:fs';
import { MAGIC_ICONS, MAGIC_ICON_NAMES, fallbackName } from '../src/lib/icons';

const rows = MAGIC_ICON_NAMES.map((name) => {
  const def = MAGIC_ICONS[name];
  return `| \`${name}\` | ${def.kind} | \`${fallbackName(def)}\` | ${def.ready ? '✅' : '—'} |`;
});
const ready = MAGIC_ICON_NAMES.filter((n) => MAGIC_ICONS[n].ready).length;

const md = `# MYGLOW — Ícones mágicos

> Gerado por \`npm run docs:icons\` a partir de \`src/lib/icons.ts\`. Não editar à mão.

Os ícones 3D dourados são PNG feitos à mão. Até existirem, \`MagicIcon\` mostra um placeholder de linha
(lucide ou glifo desenhado por código) em dourado com halo.

**Para trocar um placeholder pelo PNG final:**

1. Colocar o ficheiro em \`public/icons/magic/<name>.png\` (fundo transparente, ≥ 240 × 240 px).
   Glifos (\`phase-*\`, \`sign-*\`) devem ser PNG monocromáticos — a cor vem do tema via \`mask-image\`.
2. Mudar \`ready: false\` para \`ready: true\` na entrada correspondente de \`MAGIC_ICONS\`.
3. Correr \`npm run docs:icons\`.

**Prontos:** ${ready} de ${MAGIC_ICON_NAMES.length}

| Nome | Tipo | Placeholder | Pronto |
|---|---|---|---|
${rows.join('\n')}
`;

writeFileSync(new URL('../docs/ICONS.md', import.meta.url), md);
console.log(`docs/ICONS.md: ${MAGIC_ICON_NAMES.length} ícones, ${ready} prontos.`);
