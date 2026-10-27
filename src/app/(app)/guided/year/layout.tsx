import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { requirePlanner } from '@/lib/journey/server';

/** F19: enquanto o Ano está bloqueado na jornada, vai para a Semana. */
export default async function YearLockLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (session?.user && !(await requirePlanner(session.user.id, 'year'))) redirect('/week');
  return children;
}
