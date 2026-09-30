import fs from 'node:fs';
import path from 'node:path';
import { whatsNewSchema, type WhatsNew } from './schema';

/** `content/whats-new.json`, validado. Relido em desenvolvimento; em cache em produção. */
export const WHATS_NEW_FILE = path.join(process.cwd(), 'content', 'whats-new.json');
let cache: WhatsNew | null = null;

export function getWhatsNew(file = WHATS_NEW_FILE): WhatsNew {
  if (cache && process.env.NODE_ENV !== 'development') return cache;
  cache = whatsNewSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
  return cache;
}

/** Erros de validação (vazio = ok). Usado por `content:check`. */
export function checkWhatsNew(file = WHATS_NEW_FILE): string[] {
  try {
    const data = whatsNewSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
    const ids = data.releases.map((r) => r.id);
    return ids.filter((id, i) => ids.indexOf(id) !== i).map((id) => `whats-new.json: id repetido "${id}"`);
  } catch (e) {
    return [`whats-new.json: ${e instanceof Error ? e.message : String(e)}`];
  }
}
