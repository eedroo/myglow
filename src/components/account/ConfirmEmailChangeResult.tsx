import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { confirmEmailChange } from '@/actions/account';
import { AuthResult } from './AuthResult';

/** `/confirm-email-change?token=`: aplica o email novo (as sessões terminam; entra-se com o email novo). */
export async function ConfirmEmailChangeResult({ token }: { token: string }) {
  const [t, res] = await Promise.all([getTranslations('account.emailChange'), confirmEmailChange(token)]);
  return (
    <AuthResult
      ok={res.ok}
      title={res.ok ? t('okTitle') : t('errorTitle')}
      text={res.ok ? t('okText') : t(res.error === 'account.errors.emailNoLongerFree' ? 'takenText' : 'errorText')}
      actions={
        <Link href="/login" className="mg-btn mg-btn--primary">
          {t('login')}
        </Link>
      }
    />
  );
}
