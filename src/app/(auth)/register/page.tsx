import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { RegisterForm } from '@/components/forms/RegisterForm';
import { BetaNotice } from '@/components/beta/BetaNotice';
import { inviteRequired } from '@/lib/beta';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.register');
  return { title: t('submit') };
}

export default async function RegisterPage({ searchParams }: { searchParams: { convite?: string } }) {
  const t = await getTranslations('auth.register');
  const invite = typeof searchParams.convite === 'string' ? searchParams.convite.slice(0, 40) : '';
  return (
    <GlassCard className="mg-auth__card" variant="accent" title={t('title')}>
      <p>{t('subtitle')}</p>
      <RegisterForm betaNotice={<BetaNotice />} invite={inviteRequired() ? { initial: invite } : null} />
    </GlassCard>
  );
}
