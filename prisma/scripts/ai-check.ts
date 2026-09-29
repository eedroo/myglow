/**
 * Verifica a ligação à IA sem gravar nada: lista os modelos disponíveis para a chave e gera um horóscopo
 * de exemplo (hoje, Leão, PT-PT), validando-o com Zod e contra os factos.
 * Uso: npm run ai:check [-- --sign=LEO --locale=PT_BR]
 */
import OpenAI from 'openai';
import type { Locale, ZodiacSign } from '@prisma/client';
import { prepareSignPrompt } from '../../src/lib/ai/generate';
import { completeJson, modelFor } from '../../src/lib/ai/openai';
import { todayInTz } from '../../src/lib/dates';
import { getAiEnv } from '../../src/lib/env';

try {
  process.loadEnvFile('.env');
} catch {
  // Sem .env: usar o ambiente do processo.
}

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

async function main() {
  const env = getAiEnv();
  console.log(`Endpoint: ${env.OPENAI_BASE_URL ?? 'OpenAI'}`);
  console.log(`Modelos configurados: diário=${env.OPENAI_MODEL_DAILY} · rico=${env.OPENAI_MODEL_RICH}\n`);

  try {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });
    const ids: string[] = [];
    for await (const m of client.models.list()) ids.push(m.id.replace(/^models\//, ''));
    console.log(`Modelos disponíveis para esta chave (${ids.length}):\n  ${ids.sort().join('\n  ')}\n`);
    for (const model of [env.OPENAI_MODEL_DAILY, env.OPENAI_MODEL_RICH]) {
      if (!ids.includes(model)) console.warn(`⚠ "${model}" não aparece na lista acima.`);
    }
  } catch (err) {
    console.warn('Não foi possível listar os modelos:', err instanceof Error ? err.message : err);
  }

  const sign = (arg('sign') ?? 'LEO') as ZodiacSign;
  const locale = (arg('locale') ?? 'PT_PT') as Locale;
  const today = todayInTz('UTC');
  const p = prepareSignPrompt('DAY_HOROSCOPE', today, sign, locale);
  console.log(`\nA gerar DAY_HOROSCOPE ${today} ${sign} ${locale} com ${modelFor('DAY_HOROSCOPE')}…`);
  const started = Date.now();
  const { data } = await completeJson({
    model: modelFor('DAY_HOROSCOPE'),
    name: 'day_horoscope',
    schema: p.schema,
    messages: [
      { role: 'system', content: p.prompt.system },
      { role: 'user', content: p.prompt.user },
    ],
  });
  console.log(`Resposta em ${((Date.now() - started) / 1000).toFixed(1)} s:\n${JSON.stringify(data, null, 2)}\n`);

  const parsed = p.schema.safeParse(data);
  if (!parsed.success) {
    console.error('✗ Esquema (Zod):', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    process.exitCode = 1;
    return;
  }
  const reason = p.validate(parsed.data as never);
  if (reason) {
    console.error('✗ Validação semântica:', reason, '\n(em produção haveria 1 retry com esta razão)');
    process.exitCode = 1;
    return;
  }
  console.log('✓ Resposta válida — a IA está pronta.');
}

main().catch((err) => {
  console.error('✗ Falhou:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
