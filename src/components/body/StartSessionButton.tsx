'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { startSession } from '@/actions/fitness';
import { Button } from '@/components/ui/Button';

/** "Começar treino" (ou treino livre). Havendo uma sessão activa, volta a ela. */
export function StartSessionButton({ workoutId, label, variant = 'primary' }: { workoutId: string | null; label: string; variant?: 'primary' | 'subtle' }) {
  const te = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        block
        variant={variant}
        className={variant === 'primary' ? 'mg-btn--body' : undefined}
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await startSession(workoutId);
            if (!res.ok) return setError(te(res.error));
            router.push('/body/session');
          })
        }
      >
        {label}
      </Button>
      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
