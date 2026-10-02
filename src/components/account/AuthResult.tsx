import type { ReactNode } from 'react';
import { MagicIcon } from '@/components/ui/MagicIcon';

/** Bloco comum de `VerifyEmailResult` e `ConfirmEmailChangeResult`. */
export function AuthResult({ ok, title, text, actions }: { ok: boolean; title: string; text: string; actions: ReactNode }) {
  return (
    <div className={`mg-auth-result ${ok ? 'mg-auth-result--ok' : 'mg-auth-result--error'}`} role="status">
      <span className="mg-auth-result__icon">
        <MagicIcon name={ok ? 'sparkles' : 'moon-crescent'} size="lg" decorative />
      </span>
      <h2 className="mg-auth-result__title">{title}</h2>
      <p className="mg-auth-result__text">{text}</p>
      <div className="mg-auth-result__actions">{actions}</div>
    </div>
  );
}
