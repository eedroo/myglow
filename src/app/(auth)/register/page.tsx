import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { RegisterForm } from '@/components/forms/RegisterForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.register');
  return { title: t('submit') };
}

export default async function RegisterPage() {
  const t = await getTranslations('auth.register');
  return (
    <GlassCard className="mg-auth__card" variant="accent" title={t('title')}>
      <p>{t('subtitle')}</p>
      <RegisterForm />
    </GlassCard>
  );
}
