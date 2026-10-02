'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/lib/db';

/** Fim (ou "Saltar") da apresentação: marca como vista e segue para o primeiro dia. */
export async function markWelcomeSeen(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  await db.user.updateMany({ where: { id: session.user.id, welcomeSeenAt: null }, data: { welcomeSeenAt: new Date() } });
  redirect('/today');
}

/** Esconde o cartão "Primeiros passos". */
export async function dismissFirstSteps(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await db.user.update({ where: { id: session.user.id }, data: { firstStepsDismissedAt: new Date() } });
  revalidatePath('/today');
}
