import Link from 'next/link';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { ChevronLeft } from 'lucide-react';

/** Cabeçalho do mundo do corpo: voltar (por defeito à MYGLOW), título e acções. */
export async function BodyHeader({ title, backHref, backLabel, actions }: { title: string; backHref?: string; backLabel?: string; actions?: ReactNode }) {
  const t = await getTranslations('fitness');
  return (
    <header className="mg-body-header">
      <Link href={backHref ?? '/today'} className="mg-body-header__back">
        <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
        {backLabel ?? t('backToApp')}
      </Link>
      <h1 className="mg-body-header__title">{title}</h1>
      {actions && <div className="mg-body-header__actions">{actions}</div>}
    </header>
  );
}
