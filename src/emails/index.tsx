import type { ReactElement } from 'react';
import type { Locale } from '@prisma/client';
import { translatorFor } from '@/i18n/translator';
import { VerifyEmail } from './VerifyEmail';
import { ResetPassword } from './ResetPassword';
import { EmailChangeConfirm } from './EmailChangeConfirm';
import { EmailChangedNotice } from './EmailChangedNotice';
import { PasswordChanged } from './PasswordChanged';
import { AccountDeleted } from './AccountDeleted';

/** Os 6 emails transaccionais: assunto + componente, na língua do utilizador. */
export type EmailKind = 'verify' | 'reset' | 'email-change-confirm' | 'email-changed-notice' | 'password-changed' | 'account-deleted';

interface Base {
  locale: Locale;
  name: string;
  appUrl: string;
}

export type EmailInput =
  | (Base & { kind: 'verify'; url: string })
  | (Base & { kind: 'reset'; url: string })
  | (Base & { kind: 'email-change-confirm'; url: string; newEmail: string })
  | (Base & { kind: 'email-changed-notice'; newEmail: string })
  | (Base & { kind: 'password-changed' })
  | (Base & { kind: 'account-deleted' });

const SUBJECT_KEY = {
  verify: 'emails.verify.subject',
  reset: 'emails.reset.subject',
  'email-change-confirm': 'emails.emailChangeConfirm.subject',
  'email-changed-notice': 'emails.emailChangedNotice.subject',
  'password-changed': 'emails.passwordChanged.subject',
  'account-deleted': 'emails.accountDeleted.subject',
} as const satisfies Record<EmailKind, string>;

export function buildEmail(input: EmailInput): { subject: string; react: ReactElement } {
  const subject = translatorFor(input.locale)(SUBJECT_KEY[input.kind]);
  const base = { locale: input.locale, name: input.name, appUrl: input.appUrl };
  switch (input.kind) {
    case 'verify':
      return { subject, react: <VerifyEmail {...base} url={input.url} /> };
    case 'reset':
      return { subject, react: <ResetPassword {...base} url={input.url} /> };
    case 'email-change-confirm':
      return { subject, react: <EmailChangeConfirm {...base} url={input.url} newEmail={input.newEmail} /> };
    case 'email-changed-notice':
      return { subject, react: <EmailChangedNotice {...base} newEmail={input.newEmail} /> };
    case 'password-changed':
      return { subject, react: <PasswordChanged {...base} /> };
    case 'account-deleted':
      return { subject, react: <AccountDeleted {...base} /> };
  }
}
