import Link from 'next/link';
import type { FeedbackKind } from '@prisma/client';
import { db } from '@/lib/db';
import { GlassCard } from '@/components/ui/GlassCard';
import { FeedbackList } from '@/components/admin/FeedbackList';

const KINDS: { value: FeedbackKind | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'BUG', label: 'Erros' },
  { value: 'IDEA', label: 'Ideias' },
  { value: 'PRAISE', label: 'Elogios' },
  { value: 'OTHER', label: 'Outros' },
];

/** Feedback do beta, mais recente primeiro, com filtro por tipo. */
export default async function AdminFeedbackPage({ searchParams }: { searchParams: { kind?: string } }) {
  const kind = KINDS.some((k) => k.value === searchParams.kind && k.value !== 'ALL') ? (searchParams.kind as FeedbackKind) : null;
  const items = await db.feedback.findMany({
    where: kind ? { kind } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, kind: true, message: true, path: true, createdAt: true, user: { select: { email: true } } },
  });
  return (
    <>
      <h1 className="mg-admin__title">Feedback</h1>
      <nav className="mg-admin-nav mg-admin-nav--sub" aria-label="Filtrar por tipo">
        {KINDS.map((k) => {
          const active = (kind ?? 'ALL') === k.value;
          return (
            <Link
              key={k.value}
              href={k.value === 'ALL' ? '/admin/feedback' : `/admin/feedback?kind=${k.value}`}
              className={active ? 'mg-admin-nav__link mg-admin-nav__link--active' : 'mg-admin-nav__link'}
              aria-current={active ? 'page' : undefined}
            >
              {k.label}
            </Link>
          );
        })}
      </nav>
      <GlassCard>
        <FeedbackList items={items.map((f) => ({ ...f, email: f.user?.email ?? null }))} />
      </GlassCard>
    </>
  );
}
