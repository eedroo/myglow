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
