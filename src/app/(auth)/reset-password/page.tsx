import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { ResetPasswordForm } from '@/components/account/ResetPasswordForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account.reset');
  return { title: t('title') };
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const t = await getTranslations('account.reset');
  return (
    <GlassCard className="mg-auth__card" variant="accent" title={t('title')}>
      <ResetPasswordForm token={typeof searchParams.token === 'string' ? searchParams.token : ''} />
    </GlassCard>
  );
}
