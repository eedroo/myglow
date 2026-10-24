import Link from 'next/link';
import type { Plan, PlanSource } from '@prisma/client';
import { AdminTable } from './AdminTable';

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  lastActiveAt: Date | null;
  plan: Plan;
  planSource: PlanSource | null;
  planExpiresAt: Date | null;
  tourDone: boolean;
  coursesCompleted: number;
}

const date = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '–');

export function planLabel(u: Pick<AdminUserRow, 'plan' | 'planSource' | 'planExpiresAt'>): string {
  if (u.plan === 'FREE') return 'Grátis';
  const source = u.planSource === 'GIFT' ? 'oferta' : u.planSource === 'PAID' ? 'pago' : 'manual';
  return `Premium (${source}${u.planExpiresAt ? `, até ${date(u.planExpiresAt)}` : ''})`;
}

/** Lista de utilizadores (sem nada do diário); o email abre a ficha. */
export function UserTable({ users }: { users: AdminUserRow[] }) {
  return (
    <AdminTable
      caption="Utilizadores"
      columns={[
        { key: 'email', label: 'Email' },
        { key: 'name', label: 'Nome' },
        { key: 'created', label: 'Criado' },
        { key: 'active', label: 'Última actividade' },
        { key: 'plan', label: 'Plano' },
        { key: 'tour', label: 'Guia' },
        { key: 'courses', label: 'Cursos', numeric: true },
      ]}
      rows={users.map((u) => ({
        email: <Link href={`/admin/users/${u.id}`}>{u.email}</Link>,
        name: u.name,
        created: date(u.createdAt),
        active: date(u.lastActiveAt),
        plan: planLabel(u),
        tour: u.tourDone ? 'Sim' : 'Não',
        courses: u.coursesCompleted,
      }))}
    />
  );
}
