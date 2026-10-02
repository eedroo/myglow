import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { hasUpstash } from '@/lib/env';

/**
 * Rate limits (Upstash): pedidos de geração IA (10/h) e notificações de teste (3/h) por utilizador;
 * F9: login (5 / 15 min por email+IP), recuperação (3/h por IP e por email), reenvio da confirmação (3/h)
 * e exportação de dados (3/dia). Sem Upstash (desenvolvimento) não limita.
 */
type Window = Parameters<typeof Ratelimit.slidingWindow>[1];
const LIMITS: Record<string, { tokens: number; window: Window }> = {
  'ai-request': { tokens: 10, window: '1 h' },
  'push-test': { tokens: 3, window: '1 h' },
  login: { tokens: 5, window: '15 m' },
  'reset-ip': { tokens: 3, window: '1 h' },
  'reset-email': { tokens: 3, window: '1 h' },
  'verify-resend': { tokens: 3, window: '1 h' },
  export: { tokens: 3, window: '1 d' },
};
type LimitName = 'ai-request' | 'push-test' | 'login' | 'reset-ip' | 'reset-email' | 'verify-resend' | 'export';

const limiters = new Map<LimitName, Ratelimit>();
let warned = false;

function getLimiter(name: LimitName): Ratelimit | null {
  if (!hasUpstash()) return null;
  let l = limiters.get(name);
  if (!l) {
    const { tokens, window } = LIMITS[name]!;
    l = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(tokens, window), prefix: `myglow:${name}` });
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

/** Login: 5 tentativas / 15 min por email + IP. */
export function allowLogin(email: string, ip: string): Promise<boolean> {
  return allow('login', `${email.toLowerCase()}:${ip}`);
}

/** Recuperação da palavra-passe: 3/h por IP e 3/h por email. */
export async function allowPasswordReset(email: string, ip: string): Promise<boolean> {
  const [byIp, byEmail] = await Promise.all([allow('reset-ip', ip), allow('reset-email', email.toLowerCase())]);
  return byIp && byEmail;
}

export function allowVerificationResend(userId: string): Promise<boolean> {
  return allow('verify-resend', userId);
}

export function allowExport(userId: string): Promise<boolean> {
  return allow('export', userId);
}

/** IP do pedido (primeiro de `x-forwarded-for`, como na Vercel). */
export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown';
}
