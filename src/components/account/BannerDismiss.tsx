'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { VERIFY_BANNER_COOKIE, VERIFY_BANNER_HIDE_SECONDS } from '@/lib/account/banner';

/** Fecha o aviso de confirmação de email durante 3 dias (cookie). */
export function BannerDismiss({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="mg-banner__close"
      aria-label={label}
      onClick={() => {
        document.cookie = `${VERIFY_BANNER_COOKIE}=1; max-age=${VERIFY_BANNER_HIDE_SECONDS}; path=/; samesite=lax`;
        router.refresh();
      }}
    >
      <X size={18} aria-hidden="true" />
    </button>
  );
}
