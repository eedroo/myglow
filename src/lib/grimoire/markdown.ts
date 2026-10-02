/** Parser mínimo do texto dos cards: só `**negrito**`. Nada de HTML. Puro. */
export interface TextSegment {
  text: string;
  bold: boolean;
}

export function parseInline(input: string): TextSegment[] {
  const out: TextSegment[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (const m of input.matchAll(re)) {
    if (m.index! > last) out.push({ text: input.slice(last, m.index), bold: false });
    out.push({ text: m[1]!, bold: true });
    last = m.index! + m[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last), bold: false });
  return out;
}

// ─── Documentos (F9: páginas legais) ────────────────────────────────────────────────────────────

/** Segmento com negrito e, opcionalmente, link (`[texto](url)`; só http(s), mailto e caminhos internos). */
export interface RichSegment extends TextSegment {
  href?: string;
}

const SAFE_HREF = /^(https?:\/\/|mailto:|\/(?!\/))/i;

export function parseRich(input: string): RichSegment[] {
  const out: RichSegment[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (const m of input.matchAll(re)) {
    if (m.index! > last) out.push(...parseInline(input.slice(last, m.index)));
    const href = m[2]!;
    if (SAFE_HREF.test(href)) out.push(...parseInline(m[1]!).map((s) => ({ ...s, href })));
    else out.push({ text: m[0], bold: false });
    last = m.index! + m[0].length;
  }
  if (last < input.length) out.push(...parseInline(input.slice(last)));
  return out;
}

export type MdBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'rule' };

/**
 * Blocos: `#`/`##`/`###`, parágrafos (linhas seguidas juntam-se), listas `-`/`*` e `1.`, citações `>` e `---`.
 * Nada de HTML. Puro.
 */
export function parseBlocks(md: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];

  const flush = () => {
    if (para.length) blocks.push({ type: 'paragraph', text: para.join(' ') });
    if (list) blocks.push({ type: 'list', ...list });
    if (quote.length) blocks.push({ type: 'quote', text: quote.join(' ') });
    para = [];
    list = null;
    quote = [];
  };

  for (const raw of md.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1]!.length as 1 | 2 | 3, text: heading[2]! });
    } else if (/^-{3,}$/.test(line)) {
      flush();
      blocks.push({ type: 'rule' });
    } else if (bullet || numbered) {
      const ordered = !!numbered;
      if (para.length || quote.length || (list && list.ordered !== ordered)) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]!);
    } else if (line.startsWith('>')) {
      if (para.length || list) flush();
      quote.push(line.replace(/^>\s?/, ''));
    } else if (list && /^\s{2,}/.test(raw)) {
      // continuação de um item
      list.items[list.items.length - 1] += ` ${line}`;
    } else {
      if (list || quote.length) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
}
