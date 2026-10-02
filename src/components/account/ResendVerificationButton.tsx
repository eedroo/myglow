'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { resendVerification } from '@/actions/account';
import { Button } from '@/components/ui/Button';

/** "Reenviar email" de confirmação (banner e definições). */
export function ResendVerificationButton() {
  const t = useTranslations();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button
        variant="subtle"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await resendVerification();
            setMsg(res.ok ? 'account.banner.sent' : res.error);
          })
        }
      >
        {t('account.banner.resend')}
      </Button>
      {msg && (
        <p className="mg-banner__status" role="status">
          {t(msg)}
        </p>
      )}
    </>
  );
}
