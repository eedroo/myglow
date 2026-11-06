'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Dices } from 'lucide-react';
import { rollOcultoBelief } from '@/actions/oculto';
import { Button } from '@/components/ui/Button';

interface Props {
  beliefs: { title: string; text: string }[];
  initial: number | null;
}

/** Semana da crença aleatória: lança o dado (no servidor) e mostra a crença da semana. */
export function OcultoBeliefDie({ beliefs, initial }: Props) {
  const t = useTranslations('oculto.belief');
  const te = useTranslations();
  const router = useRouter();
  const [belief, setBelief] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const b = belief !== null ? beliefs[belief] : undefined;

  const roll = async () => {
    setBusy(true);
    setError(null);
    const res = await rollOcultoBelief().catch(() => ({ ok: false as const, error: 'oculto.errors.offline' }));
    setBusy(false);
    if (!res.ok) {
      setError(te(res.error));
      return;
    }
    setBelief(res.data.belief);
    router.refresh();
  };

  return (
    <div className="mg-oculto-belief" aria-live="polite">
      {b ? (
        <>
          <p className="mg-oculto-step__label">
            {t('yours', { n: belief! + 1 })}
          </p>
          <p className="mg-oculto-belief__title">{b.title}</p>
          <p className="mg-oculto-belief__text">{b.text}</p>
        </>
      ) : (
        <>
          <p className="mg-oculto-step__label">{t('title')}</p>
          <p className="mg-oculto-belief__text">{t('help', { n: beliefs.length })}</p>
          <Button onClick={roll} loading={busy}>
            <Dices size={18} aria-hidden="true" className="mg-oculto-belief__die" /> {t('roll')}
          </Button>
          {error && (
            <p className="mg-step__error" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
