import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { LessonPlayer } from '@/components/grimoire/LessonPlayer';
import { contentPrefsFor, getLessonPlayerData } from '@/lib/grimoire/queries';

/** Leitor de uma lição. Bloqueada, limite atingido ou curso bloqueado → volta ao mapa com o motivo. */
export default async function LessonPage({ params }: { params: { course: string; lesson: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true, locale: true } });
  if (!user) redirect('/login');

  const res = await getLessonPlayerData(session.user.id, params.course, params.lesson, user.timezone, contentPrefsFor(user.locale));
  if ('notice' in res) redirect(`/grimoire?notice=${res.notice}`);
  return <LessonPlayer key={`${params.course}/${params.lesson}`} data={res.data} />;
}
