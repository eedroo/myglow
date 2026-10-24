import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 3000;

/** Verificação de saúde (F12) para a monitorização externa: só diz se a base responde. Sem detalhes internos. */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
    ]);
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
