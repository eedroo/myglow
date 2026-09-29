import { z } from 'zod';

/**
 * Variáveis de ambiente da IA, Inngest e Upstash (Fase 6), validadas com Zod.
 * Em produção a app falha no arranque se faltar alguma (ver `src/instrumentation.ts`);
 * em desenvolvimento e testes as funcionalidades que dependem delas degradam com aviso.
 */
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL_DAILY: z.string().min(1),
  OPENAI_MODEL_RICH: z.string().min(1),
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

/** Lança um erro com a lista de variáveis em falta. */
export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`[env] Variáveis de ambiente em falta ou inválidas: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}

/** Chamado no arranque do servidor em produção. */
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
