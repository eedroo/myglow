import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { verifyEmail } from '@/actions/account';
import { AuthResult } from './AuthResult';

/** `/verify-email?token=`: consome o token e mostra o resultado. */
export async function VerifyEmailResult({ token }: { token: string }) {
  const [t, res, session] = await Promise.all([getTranslations('account.verify'), verifyEmail(token), auth()]);
  const loggedIn = !!session?.user;
  return (
    <AuthResult
      ok={res.ok}
      title={res.ok ? t('okTitle') : t('errorTitle')}
      text={res.ok ? t('okText') : t('errorText')}
      actions={
        <Link href={loggedIn ? '/today' : '/login'} className="mg-btn mg-btn--primary">
          {loggedIn ? t('goToApp') : t('login')}
        </Link>
      }
    />
  );
}
