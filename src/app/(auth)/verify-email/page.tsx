import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { VerifyEmailResult } from '@/components/account/VerifyEmailResult';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account.verify');
  return { title: t('pageTitle') };
}

export default function VerifyEmailPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <GlassCard className="mg-auth__card" variant="accent">
      <VerifyEmailResult token={typeof searchParams.token === 'string' ? searchParams.token : ''} />
    </GlassCard>
  );
}
