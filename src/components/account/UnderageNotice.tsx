'use client';

import { useTranslations } from 'next-intl';
import { DeleteAccountDialog } from './DeleteAccountDialog';

/** Onboarding com menos de 16 anos: não continua; a conta fica bloqueada com a opção de a apagar. */
export function UnderageNotice({ confirmWord }: { confirmWord: string }) {
  const t = useTranslations('account.underage');
  return (
    <div className="mg-danger" role="alert">
      <h2 className="mg-danger__title">{t('title')}</h2>
      <p className="mg-danger__text">{t('text')}</p>
      <DeleteAccountDialog confirmWord={confirmWord} showExport={false} />
    </div>
  );
}
