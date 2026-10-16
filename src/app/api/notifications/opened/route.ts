import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/lib/db';

const bodySchema = z.object({ id: z.string().min(1).max(40) });

/**
 * Chamado pelo service worker quando a pessoa toca numa notificação push: marca o aviso como lido.
 * É o sinal de "aberto" que o recuo automático usa (avisos ignorados seguidos passam a dia sim, dia não).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  await db.notificationLog.updateMany({ where: { id: parsed.data.id, userId: session.user.id, readAt: null }, data: { readAt: new Date() } });
  return new Response(null, { status: 204 });
}
