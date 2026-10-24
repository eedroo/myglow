import 'server-only';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';

/** Área de administração (F12): só para os emails em `ADMIN_EMAILS` (separados por vírgulas; vazio = ninguém). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && adminEmails().includes(email.trim().toLowerCase());
}

/** Sessão de admin ou `notFound()`: a área não se revela a quem não é admin. */
export async function requireAdmin(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user?.id || !isAdminEmail(session.user.email)) notFound();
  return { userId: session.user.id };
}
