import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { auth } from '@/auth';
import { requireAdmin } from '@/lib/admin';
import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { ThemeSync } from '@/components/providers/ThemeSync';
import { AdminNav } from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Administração', robots: { index: false, follow: false } };

/** Área de administração (F12): só para ADMIN_EMAILS; para os outros, 404. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const session = await auth();
  return (
    <>
      <AmbientBackground />
      <ThemeSync theme={session!.user.theme} />
      <div className="mg-admin-shell">
        <AdminNav />
        <main id="main" className="mg-admin">
          {children}
        </main>
      </div>
    </>
  );
}
