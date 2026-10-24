'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { restartTour } from '@/actions/tour';
import { Button } from '@/components/ui/Button';
import { useTour } from './TourProvider';

/** "Fazer o guia": recomeça o guia do primeiro passo e abre o dia de hoje. */
export function StartTourButton({ label, variant = 'subtle' }: { label: string; variant?: 'subtle' | 'ghost' | 'primary' }) {
  const router = useRouter();
  const tour = useTour();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant={variant}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const res = await restartTour();
        if (res.ok) {
          tour?.restartLocal();
          router.push('/today');
        }
        setBusy(false);
      }}
    >
      {label}
    </Button>
  );
}
