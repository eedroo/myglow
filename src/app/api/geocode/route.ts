import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { searchPlaces } from '@/lib/geocode';

export const revalidate = 86400;

const querySchema = z.object({
  q: z.string().trim().min(2).max(100),
  lang: z.enum(['pt', 'en']).default('pt'),
});

/** GET /api/geocode?q=&lang= — autocomplete de locais (Open-Meteo). */
export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({
    q: request.nextUrl.searchParams.get('q') ?? '',
    lang: request.nextUrl.searchParams.get('lang') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: 'invalid_query' }, { status: 400 });

  try {
    const results = await searchPlaces(parsed.data.q, parsed.data.lang);
    return NextResponse.json(
      { results },
      { headers: { 'Cache-Control': 'private, max-age=86400' } },
    );
  } catch {
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }
}
