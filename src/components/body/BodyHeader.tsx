import Link from 'next/link';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { ChevronLeft } from 'lucide-react';
import { BackButton } from './BackButton';

/**
 * Cabeçalho do mundo do corpo: voltar (por defeito à MYGLOW), título e acções. Com `historyBack`, "Voltar" regressa
 * à página anterior (e `backHref` só serve quando não há histórico).
 */
export async function BodyHeader({
  title,
  backHref,
  backLabel,
  actions,
  historyBack = false,
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  historyBack?: boolean;
}) {
  const [t, tc] = await Promise.all([getTranslations('fitness'), getTranslations('common')]);
  return (
    <header className="mg-body-header">
      {historyBack ? (
        <BackButton fallback={backHref ?? '/body'} label={tc('back')} className="mg-body-header__back" />
      ) : (
        <Link href={backHref ?? '/today'} className="mg-body-header__back">
          <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
          {backLabel ?? t('backToApp')}
        </Link>
      )}
      <h1 className="mg-body-header__title">{title}</h1>
      {actions && <div className="mg-body-header__actions">{actions}</div>}
    </header>
  );
}
