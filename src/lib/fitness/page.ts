import 'server-only';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { requireFeature } from '@/lib/entitlements/server';
import { isAppLocale, type AppLocale } from '@/i18n/locales';

/** Páginas do mundo do corpo: sessão, acesso `body-pro` (sem ele → 404) e a língua do pedido. */
export async function bodyPage(): Promise<{ userId: string; locale: AppLocale }> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  await requireFeature(session.user.id, 'body-pro');
  const raw = await getLocale();
  return { userId: session.user.id, locale: isAppLocale(raw) ? raw : 'pt-PT' };
}
