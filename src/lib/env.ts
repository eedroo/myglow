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

const envSchema = aiEnvSchema.extend({
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
});

export type AppEnv = z.infer<typeof envSchema>;
export type AiEnv = z.infer<typeof aiEnvSchema>;

let cached: AppEnv | null = null;
let cachedAi: AiEnv | null = null;

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
