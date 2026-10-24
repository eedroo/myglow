import Link from 'next/link';
import { db } from '@/lib/db';
import { GlassCard } from '@/components/ui/GlassCard';
import { UserTable } from '@/components/admin/UserTable';

const PAGE = 50;

/** Utilizadores: pesquisa por email, 50 por página. Sem nada do diário. */
export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q ?? '').trim().slice(0, 120);
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = q ? { email: { contains: q, mode: 'insensitive' as const } } : {};
  const [count, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true, email: true, name: true, createdAt: true, lastActiveAt: true, plan: true, planSource: true, planExpiresAt: true,
        tourCompletedAt: true, _count: { select: { courseProgress: { where: { completedAt: { not: null } } } } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(count / PAGE));
  const href = (p: number) => `/admin/users?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`;

  return (
    <>
      <h1 className="mg-admin__title">Utilizadores</h1>
      <form className="mg-admin-search" action="/admin/users">
        <label className="mg-visually-hidden" htmlFor="admin-q">
          Pesquisar por email
        </label>
        <input id="admin-q" name="q" type="search" placeholder="Pesquisar por email" defaultValue={q} />
        <button type="submit" className="mg-btn mg-btn--subtle">
          Pesquisar
        </button>
      </form>
      <GlassCard>
        <div className="mg-admin__scroll">
          <UserTable
            users={users.map((u) => ({
              ...u,
              tourDone: u.tourCompletedAt !== null,
              coursesCompleted: u._count.courseProgress,
            }))}
          />
        </div>
        <p className="mg-admin__note">
          {count} {count === 1 ? 'pessoa' : 'pessoas'} · página {page} de {pages}
          {page > 1 && (
            <>
              {' · '}
              <Link href={href(page - 1)}>anterior</Link>
            </>
          )}
          {page < pages && (
            <>
              {' · '}
              <Link href={href(page + 1)}>seguinte</Link>
            </>
          )}
        </p>
      </GlassCard>
    </>
  );
}
