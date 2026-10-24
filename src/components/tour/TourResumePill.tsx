'use client';

import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';

/** Guia em pausa (ou noutra página): pílula flutuante para retomar. */
export function TourResumePill({ onResume }: { onResume: () => void }) {
  const t = useTranslations('tour');
  return (
    <button type="button" className="mg-tour-pill" onClick={onResume}>
      <MagicIcon name="sparkles" size="sm" decorative />
      {t('resume')}
    </button>
  );
}
