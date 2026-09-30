'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { setReadInPortuguese } from '@/actions/grimoire';

/** EN sem conteúdo: "coming soon" + ler em português (cookie). */
export function ComingSoonGrimoire() {
  const t = useTranslations('grimoire.comingSoon');
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <GlassCard className="mg-coming-soon">
      <MagicIcon name="grimoire" size="xl" decorative />
      <h2 className="mg-coming-soon__title">{t('title')}</h2>
      <p className="mg-coming-soon__text">{t('text')}</p>
      <Button
        loading={pending}
        onClick={() =>
          start(async () => {
            await setReadInPortuguese(true);
            router.refresh();
          })
        }
      >
        {t('readPt')}
      </Button>
    </GlassCard>
  );
}
