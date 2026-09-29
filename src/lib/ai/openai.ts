import 'server-only';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { z } from 'zod';
import type { SignContentKind, UserContentKind } from '@prisma/client';
import { getAiEnv } from '@/lib/env';
import { wireSchema } from './schemas';

/**
 * Cliente (lazy) de uma API compatível com a da OpenAI e wrapper de saída estruturada. Só corre dentro de
 * funções Inngest e dos scripts. Com `OPENAI_BASE_URL` pode apontar para outro fornecedor (ex.: Gemini).
 */
let client: OpenAI | null = null;

function getClient(): OpenAI {
  const env = getAiEnv();
  // maxRetries: repete com espera em 429/5xx (limites de planos gratuitos).
  client ??= new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL, maxRetries: 5 });
  return client;
}

export type AiKind = SignContentKind | UserContentKind;

/** DAY_* e WEEK_* usam o modelo rápido; MONTH_* o modelo maior. */
export function modelFor(kind: AiKind): string {
  const env = getAiEnv();
  return kind.startsWith('MONTH_') ? env.OPENAI_MODEL_RICH : env.OPENAI_MODEL_DAILY;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Pede uma resposta JSON conforme `schema` (versão de fio, sem limites de texto) e devolve o objecto
 * ainda não validado pelo esquema completo — isso é feito em `generate.ts`.
 */
export async function completeJson(i: {
  model: string;
  name: string;
  schema: z.ZodTypeAny;
  messages: ChatMessage[];
}): Promise<{ data: unknown; raw: string }> {
  const completion = await getClient().chat.completions.parse({
    model: i.model,
    messages: i.messages,
    response_format: zodResponseFormat(wireSchema(i.schema), i.name),
  });
  const message = completion.choices[0]?.message;
  if (!message || message.refusal) throw new Error(`[ai] Sem resposta utilizável (${message?.refusal ?? 'vazia'})`);
  return { data: message.parsed, raw: message.content ?? '' };
}
