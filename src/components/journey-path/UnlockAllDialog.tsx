'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { unlockAll } from '@/actions/journey';
import { Button } from '@/components/ui/Button';

/** F19: "Já conheço a metodologia" → abre o diário completo (em `/journey` e nas definições → Diário). */
export function UnlockAllDialog({ variant = 'button' }: { variant?: 'link' | 'button' }) {
  const t = useTranslations('journey.unlockAll');
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    const r = await unlockAll().catch(() => ({ ok: false as const }));
    setBusy(false);
    if (r.ok) {
      ref.current?.close();
      router.push('/today');
      router.refresh();
    }
  };

  return (
    <>
      {variant === 'link' ? (
        <button type="button" className="mg-unlock-all__link" onClick={() => ref.current?.showModal()}>
          {t('trigger')}
        </button>
      ) : (
        <Button variant="ghost" onClick={() => ref.current?.showModal()}>
          {t('button')}
        </Button>
      )}
      <dialog ref={ref} className="mg-unlock-all" aria-labelledby="unlock-all-title">
        <h2 id="unlock-all-title" className="mg-unlock-all__title">
          {t('title')}
        </h2>
        <p className="mg-unlock-all__text">{t('text')}</p>
        <div className="mg-unlock-all__actions">
          <Button onClick={() => void confirm()} disabled={busy}>
            {t('confirm')}
          </Button>
          <Button variant="subtle" onClick={() => ref.current?.close()}>
            {t('cancel')}
          </Button>
        </div>
      </dialog>
    </>
  );
}
