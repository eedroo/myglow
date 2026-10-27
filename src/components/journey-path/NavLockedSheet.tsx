'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** F19: Mês ou Ano bloqueados → "abrem quando fechar a primeira semana", com o caminho para a Semana. */
export const NavLockedSheet = forwardRef<HTMLDialogElement>(function NavLockedSheet(_, ref) {
  const t = useTranslations('journey.navLocked');
  const close = () => (ref && typeof ref !== 'function' ? ref.current?.close() : undefined);
  return (
    <dialog ref={ref} className="mg-nav-locked" aria-labelledby="nav-locked-title">
      <span className="mg-nav-locked__icon" aria-hidden="true">
        <Lock size={20} />
      </span>
      <h2 id="nav-locked-title" className="mg-nav-locked__title">
        {t('title')}
      </h2>
      <p className="mg-nav-locked__text">{t('text')}</p>
      <div className="mg-nav-locked__actions">
        <Link href="/week" className="mg-btn mg-btn--primary" onClick={close}>
          {t('cta')}
        </Link>
        <Button variant="subtle" onClick={close}>
          {t('close')}
        </Button>
      </div>
    </dialog>
  );
});
