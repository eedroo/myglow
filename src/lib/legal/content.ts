import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { AppLocale } from '@/i18n/locales';
import { parseBlocks, type MdBlock } from '@/lib/grimoire/markdown';

/** Documentos legais em `content/legal/<doc>/<locale>.md`: cabeçalho `version:` + `date:` e corpo em markdown mínimo. */
export type LegalDoc = 'privacy' | 'terms';

export interface LegalDocument {
  version: string;
  date: string; // YYYY-MM-DD
  draft: MdBlock | null; // primeira citação (aviso de rascunho)
  blocks: MdBlock[];
}

const ROOT = path.join(process.cwd(), 'content', 'legal');

export function parseLegal(source: string): LegalDocument {
  const meta: Record<string, string> = {};
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  for (; i < lines.length; i++) {
    const m = /^(\w+):\s*(.+)$/.exec(lines[i]!.trim());
    if (!m) break;
    meta[m[1]!] = m[2]!;
  }
  const blocks = parseBlocks(lines.slice(i).join('\n'));
  const draftIndex = blocks.findIndex((b) => b.type === 'quote');
  const draft = draftIndex === 0 ? blocks[0]! : null;
  return { version: meta.version ?? '', date: meta.date ?? '', draft, blocks: draft ? blocks.slice(1) : blocks };
}

export function getLegalDocument(doc: LegalDoc, locale: AppLocale): LegalDocument {
  const file = path.join(ROOT, doc, `${locale}.md`);
  const fallback = path.join(ROOT, doc, 'pt-PT.md');
  return parseLegal(fs.readFileSync(fs.existsSync(file) ? file : fallback, 'utf8'));
}
