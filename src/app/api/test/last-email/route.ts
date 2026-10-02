import { NextResponse, type NextRequest } from 'next/server';
import { getLastEmail } from '@/lib/email/send';

/**
 * Último email capturado em memória para `?to=` — só para os e2e. Activo com NODE_ENV=test ou, fora de
 * produção, com EMAIL_TEST_ENDPOINT=1 (o Playwright corre `next dev`, onde NODE_ENV é "development").
 * Em produção responde sempre 404.
 */
export const dynamic = 'force-dynamic';

function enabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.NODE_ENV === 'test' || process.env.EMAIL_TEST_ENDPOINT === '1';
}

export function GET(req: NextRequest) {
  if (!enabled()) return new NextResponse(null, { status: 404 });
  const to = req.nextUrl.searchParams.get('to');
  if (!to) return NextResponse.json({ error: 'missing to' }, { status: 400 });
  const email = getLastEmail(to);
  if (!email) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const links = [...email.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!.replaceAll('&amp;', '&'));
  return NextResponse.json({ ...email, links });
}
