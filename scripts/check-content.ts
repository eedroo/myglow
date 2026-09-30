/** Valida o conteúdo do Grimório (`content/grimoire`). Uso: npm run content:check */
import { checkContent } from '../src/lib/grimoire/content';

const errors = checkContent();
if (errors.length) {
  console.error(`✗ Conteúdo do Grimório com ${errors.length} erro(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log('✓ Conteúdo do Grimório válido.');
