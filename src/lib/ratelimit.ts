import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { hasUpstash } from '@/lib/env';

/**
 * Rate limits por utilizador (Upstash): pedidos de geração IA (10/h) e notificações de teste (3/h).
 * Sem Upstash (desenvolvimento) não limita.
 */
const LIMITS = {
  'ai-request': 10,
  'push-test': 3,
} as const;
type LimitName = keyof typeof LIMITS;

const limiters = new Map<LimitName, Ratelimit>();
let warned = false;

function getLimiter(name: LimitName): Ratelimit | null {
  if (!hasUpstash()) return null;
  let l = limiters.get(name);
  if (!l) {
    l = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(LIMITS[name], '1 h'), prefix: `myglow:${name}` });
    limiters.set(name, l);
  }
  return l;
}

/** `true` se o pedido pode seguir. Sem Upstash (desenvolvimento) não limita. */
async function allow(name: LimitName, userId: string): Promise<boolean> {
  const l = getLimiter(name);
  if (!l) {
    if (!warned) console.warn('[ratelimit] Upstash não configurado: pedidos sem limite.');
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

export function allowAiRequest(userId: string): Promise<boolean> {
  return allow('ai-request', userId);
}

export function allowTestNotification(userId: string): Promise<boolean> {
  return allow('push-test', userId);
}
