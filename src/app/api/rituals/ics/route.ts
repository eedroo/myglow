import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { appUrl } from '@/lib/env';
import { getRituals } from '@/lib/ai/queries';
import { translatorFor } from '@/i18n/translator';
import { ritualDescription, ritualIcs } from '@/lib/rituals/calendar';

/** Ritual do mês como ficheiro .ics (Apple Calendar, Outlook…): `?month=YYYY-MM&id=<ritual>`. Só o próprio. */
export const dynamic = 'force-dynamic';

const query = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), id: z.string().min(1).max(120) });

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = query.safeParse({ month: req.nextUrl.searchParams.get('month'), id: req.nextUrl.searchParams.get('id') });
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true } });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const rituals = await getRituals(userId, user.locale, `${parsed.data.month}-01`);
  const ritual = rituals?.rituals.find((r) => r.id === parsed.data.id);
  if (!ritual) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const t = translatorFor(user.locale);
  const link = `${appUrl()}/month/${parsed.data.month}`;
  const details = ritualDescription(
    ritual,
    {
      intention: t('reading.ritual.intention'),
      materials: t('reading.ritual.materials'),
      steps: t('reading.ritual.steps'),
      openApp: t('reading.ritual.openApp'),
    },
    link,
  );
  return new NextResponse(ritualIcs(ritual, details, link), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="myglow-ritual-${ritual.date}.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
