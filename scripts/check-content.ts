/** Valida o conteúdo do Grimório (`content/grimoire`) e as novidades (`content/whats-new.json`). Uso: npm run content:check */
import { checkContent } from '../src/lib/grimoire/content';
import { checkWhatsNew } from '../src/lib/whats-new/content';

const errors = [...checkContent(), ...checkWhatsNew()];
if (errors.length) {
  console.error(`✗ Conteúdo com ${errors.length} erro(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log('✓ Conteúdo do Grimório e novidades válidos.');
