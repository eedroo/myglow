import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { ForgotPasswordForm } from '@/components/account/ForgotPasswordForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account.forgot');
  return { title: t('title') };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations('account.forgot');
  return (
    <GlassCard className="mg-auth__card" variant="accent" title={t('title')}>
      <ForgotPasswordForm />
    </GlassCard>
  );
}
