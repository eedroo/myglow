import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { ConfirmEmailChangeResult } from '@/components/account/ConfirmEmailChangeResult';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account.emailChange');
  return { title: t('pageTitle') };
}

export default function ConfirmEmailChangePage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <GlassCard className="mg-auth__card" variant="accent">
      <ConfirmEmailChangeResult token={typeof searchParams.token === 'string' ? searchParams.token : ''} />
    </GlassCard>
  );
}
