import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getEntitlements } from '@/lib/entitlements/server';
import { FEATURE_KEYS } from '@/lib/entitlements/features';
import { GlassCard } from '@/components/ui/GlassCard';
import { AdminTable } from '@/components/admin/AdminTable';
import { planLabel } from '@/components/admin/UserTable';
import { UserPlanForm } from '@/components/admin/UserPlanForm';
import { FeatureOverrideRow } from '@/components/admin/FeatureOverrideRow';

const date = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '–');

/** Ficha de uma pessoa: dados da conta (sem diário), plano e excepções por funcionalidade. */
export default async function AdminUserPage({ params }: { params: { id: string } }) {
  const user = await db.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, email: true, name: true, createdAt: true, lastActiveAt: true, plan: true, planSource: true, planSince: true,
      planExpiresAt: true, premiumInterestAt: true, tourCompletedAt: true, locale: true,
      featureOverrides: { select: { key: true, enabled: true } },
      _count: { select: { courseProgress: { where: { completedAt: { not: null } } }, activeDays: true, friendshipsA: true, friendshipsB: true } },
    },
  });
  if (!user) notFound();
  const ent = await getEntitlements(user.id);
  const overrides = new Map(user.featureOverrides.map((o) => [o.key, o.enabled]));

  return (
    <>
      <p className="mg-admin__note">
        <Link href="/admin/users">← Utilizadores</Link>
      </p>
      <h1 className="mg-admin__title">{user.email}</h1>
      <GlassCard title="Conta">
        <AdminTable
          caption="Dados da conta"
          columns={[
            { key: 'k', label: 'Campo' },
            { key: 'v', label: 'Valor' },
          ]}
          rows={[
            { k: 'Nome', v: user.name },
            { k: 'Língua', v: user.locale },
            { k: 'Criado', v: date(user.createdAt) },
            { k: 'Última actividade', v: date(user.lastActiveAt) },
            { k: 'Dias com actividade', v: user._count.activeDays },
            { k: 'Plano', v: planLabel(user) },
            { k: 'Premium desde', v: date(user.planSince) },
            { k: 'Interesse no premium', v: date(user.premiumInterestAt) },
            { k: 'Guia concluído', v: user.tourCompletedAt ? date(user.tourCompletedAt) : 'Não' },
            { k: 'Cursos concluídos', v: user._count.courseProgress },
            { k: 'Amigos', v: user._count.friendshipsA + user._count.friendshipsB },
          ]}
        />
      </GlassCard>
      <GlassCard title="Plano">
        <UserPlanForm
          userId={user.id}
          plan={user.plan}
          source={user.planSource === 'GIFT' ? 'GIFT' : 'MANUAL'}
          expiresAt={user.planExpiresAt ? date(user.planExpiresAt) : null}
        />
      </GlassCard>
      <GlassCard title="Funcionalidades">
        {FEATURE_KEYS.map((key) => (
          <FeatureOverrideRow key={key} userId={user.id} featureKey={key} override={overrides.get(key) ?? null} effective={ent.features[key]} />
        ))}
      </GlassCard>
    </>
  );
}
