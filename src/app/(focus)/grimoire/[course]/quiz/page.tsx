import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { QuizPlayer } from '@/components/grimoire/QuizPlayer';
import { contentPrefsFor, getQuizData } from '@/lib/grimoire/queries';

/** Quiz final do curso (só com todas as lições concluídas). */
export default async function QuizPage({ params }: { params: { course: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { timezone: true, locale: true } });
  if (!user) redirect('/login');

  const res = await getQuizData(session.user.id, params.course, user.timezone, contentPrefsFor(user.locale));
  if ('notice' in res) redirect(`/grimoire?notice=${res.notice}`);
  return <QuizPlayer data={res.data} />;
}
