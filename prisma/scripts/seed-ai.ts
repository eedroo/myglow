/**
 * Gera o conteúdo partilhado por signo de hoje, desta semana e deste mês (UTC): 3 tipos × 12 signos × 3 línguas.
 * Usar no deploy (ou depois de um buraco nos crons). Salta o que já existe.
 * Uso: npm run ai:seed [-- --only=DAY_HOROSCOPE]
 * (corre com `--conditions=react-server` para poder importar módulos `server-only`)
 */
import type { Locale } from '@prisma/client';
import { generateSignContent } from '../../src/lib/ai/generate';
import { currentSignJobs } from '../../src/lib/ai/schedule';
import { ZODIAC_ORDER } from '../../src/lib/astro/zodiac';
import { db } from '../../src/lib/db';
import { getEnv } from '../../src/lib/env';

try {
  process.loadEnvFile('.env');
} catch {
  // Sem .env (ex.: Vercel): usar o ambiente do processo.
}

const LOCALES: Locale[] = ['PT_PT', 'PT_BR', 'EN'];
const CONCURRENCY = 5;
const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];

async function main() {
  getEnv(); // falha já, com a lista de variáveis em falta
  const tasks = currentSignJobs(new Date())
    .filter((j) => !only || j.kind === only)
    .flatMap((j) => ZODIAC_ORDER.flatMap((sign) => LOCALES.map((locale) => ({ ...j, sign, locale }))));

  const counts: Record<string, number> = {};
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const t = tasks[next++]!;
      const outcome = await generateSignContent(t.kind, t.periodStart, t.sign, t.locale).catch((err) => {
        console.error(`${t.kind} ${t.periodStart} ${t.sign} ${t.locale}:`, err instanceof Error ? err.message : err);
        return 'error';
      });
      counts[outcome] = (counts[outcome] ?? 0) + 1;
      console.log(`${t.kind} ${t.periodStart} ${t.sign} ${t.locale} → ${outcome}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log('Resumo:', counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
