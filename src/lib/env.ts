import { z } from 'zod';

/**
 * Variáveis de ambiente da IA, Inngest e Upstash (Fase 6), validadas com Zod.
 * Se faltar alguma, o arranque regista um erro claro (ver `src/instrumentation.ts`) mas a app continua a
 * funcionar: as funcionalidades de IA degradam (leituras ficam "a preparar", eventos não são enviados).
 */
const aiEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL_DAILY: z.string().min(1),
  OPENAI_MODEL_RICH: z.string().min(1),
  // Opcional: API compatível com a da OpenAI (ex.: Gemini em https://generativelanguage.googleapis.com/v1beta/openai/).
  OPENAI_BASE_URL: z.string().url().optional(),
  // Pedidos por minuto à IA (throttle do Inngest). Planos gratuitos têm limites baixos.
  AI_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).max(10_000).default(60),
});

/** Web Push (F7). Gerar com `npx web-push generate-vapid-keys`. */
const pushEnvSchema = z.object({
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().regex(/^(mailto:|https:\/\/)/),
});

/** Email transaccional (F9): Resend. Sem chave em desenvolvimento/teste os emails ficam em memória. */
const emailEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(3),
  EMAIL_REPLY_TO: z.string().email(),
});

/** URL pública e versões dos documentos legais (F9). */
const appEnvSchema = z.object({
  APP_URL: z.string().url(),
  LEGAL_TERMS_VERSION: z.string().min(1),
  LEGAL_PRIVACY_VERSION: z.string().min(1),
});

const envSchema = aiEnvSchema.merge(pushEnvSchema).merge(emailEnvSchema).merge(appEnvSchema).extend({
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
});

export type AppEnv = z.infer<typeof envSchema>;
export type AiEnv = z.infer<typeof aiEnvSchema>;
export type PushEnv = z.infer<typeof pushEnvSchema>;
export type EmailEnv = z.infer<typeof emailEnvSchema>;

let cached: AppEnv | null = null;
let cachedAi: AiEnv | null = null;
let cachedPush: PushEnv | null = null;

function parseEnv<S extends z.ZodTypeAny>(schema: S): z.output<S> {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`[env] Variáveis de ambiente em falta ou inválidas: ${missing}`);
  }
  return parsed.data;
}

/** Toda a configuração (IA + Inngest + Upstash). Lança com a lista de variáveis em falta. */
export function getEnv(): AppEnv {
  cached ??= parseEnv(envSchema);
  return cached;
}

/** Só o necessário para gerar texto (usado pela geração e pelos scripts). */
export function getAiEnv(): AiEnv {
  cachedAi ??= parseEnv(aiEnvSchema);
  return cachedAi;
}

/** Só as chaves VAPID (envio de push). */
export function getPushEnv(): PushEnv {
  cachedPush ??= parseEnv(pushEnvSchema);
  return cachedPush;
}

/** Configuração do Resend. */
export function getEmailEnv(): EmailEnv {
  return parseEnv(emailEnvSchema);
}

/** Há Resend configurado? (sem ele, fora de produção, os emails ficam em memória e na consola) */
export function hasEmail(): boolean {
  return emailEnvSchema.safeParse(process.env).success;
}

/** URL pública da app (links nos emails), sem barra final. */
export function appUrl(): string {
  return (process.env.APP_URL || process.env.AUTH_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/** Versões actuais dos Termos e da Política de Privacidade (re-aceitação quando mudam). */
export const DEFAULT_LEGAL_VERSION = '2026-10';
export function legalVersions(): { terms: string; privacy: string } {
  return {
    terms: process.env.LEGAL_TERMS_VERSION || DEFAULT_LEGAL_VERSION,
    privacy: process.env.LEGAL_PRIVACY_VERSION || DEFAULT_LEGAL_VERSION,
  };
}

/** Há chaves VAPID para enviar push? (sem elas os avisos ficam só na caixa da app) */
export function hasPush(): boolean {
  return pushEnvSchema.safeParse(process.env).success;
}

/** Pedidos por minuto à IA (sem validar o resto da env; usado na definição das funções Inngest). */
export function aiRequestsPerMinute(): number {
  const n = Number(process.env.AI_REQUESTS_PER_MINUTE);
  return Number.isInteger(n) && n > 0 ? n : 60;
}

/** Lança se faltar configuração; chamado no arranque do servidor em produção. */
export function assertEnv(): void {
  getEnv();
}

/** Há credenciais para a OpenAI (geração)? */
export function hasOpenAi(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL_DAILY && process.env.OPENAI_MODEL_RICH);
}

/** Há Upstash configurado (rate limit)? */
export function hasUpstash(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
