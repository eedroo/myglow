'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { db } from '@/lib/db';

/** Esconde o cartão "Primeiros passos". */
export async function dismissFirstSteps(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await db.user.update({ where: { id: session.user.id }, data: { firstStepsDismissedAt: new Date() } });
  revalidatePath('/today');
}
