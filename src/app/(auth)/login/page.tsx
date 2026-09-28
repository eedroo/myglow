import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoginForm } from '@/components/forms/LoginForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.login');
  return { title: t('submit') };
}

export default async function LoginPage() {
  const t = await getTranslations('auth.login');
  return (
    <GlassCard className="mg-auth__card" variant="accent" title={t('title')}>
      <p>{t('subtitle')}</p>
      <LoginForm />
    </GlassCard>
  );
}
