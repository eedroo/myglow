import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { hasUpstash } from '@/lib/env';

/** Rate limit dos pedidos de geração IA: 10 por hora por utilizador (Upstash). */
let limiter: Ratelimit | null = null;
let warned = false;

function getLimiter(): Ratelimit | null {
  if (!hasUpstash()) return null;
  limiter ??= new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'myglow:ai-request',
  });
  return limiter;
}

/** `true` se o pedido pode seguir. Sem Upstash (desenvolvimento) não limita. */
export async function allowAiRequest(userId: string): Promise<boolean> {
  const l = getLimiter();
  if (!l) {
    if (!warned) console.warn('[ratelimit] Upstash não configurado: pedidos IA sem limite.');
    warned = true;
    return true;
  }
  try {
    return (await l.limit(userId)).success;
  } catch (err) {
    console.warn('[ratelimit] Falha no Upstash:', err instanceof Error ? err.message : err);
    return true;
  }
}
