import { Text } from '@react-email/components';
import { translatorFor } from '@/i18n/translator';
import { EMAIL_COLORS, EmailLayout, paragraphStyle } from './EmailLayout';

/** Feedback do beta para a equipa (F10), em pt-PT (vai para a caixa da Onda, não para o utilizador). */
export interface FeedbackEmailProps {
  kind: string;
  message: string;
  userName: string;
  userEmail: string;
  path: string | null;
  locale: string | null;
  userAgent: string | null;
  appUrl: string;
}

export function FeedbackEmail(p: FeedbackEmailProps) {
  const t = translatorFor('PT_PT');
  const meta = [
    t('emails.feedback.from', { name: p.userName, email: p.userEmail }),
    p.path && t('emails.feedback.page', { path: p.path }),
    p.locale && t('emails.feedback.locale', { locale: p.locale }),
    p.userAgent && t('emails.feedback.browser', { ua: p.userAgent }),
  ].filter(Boolean);
  return (
    <EmailLayout
      lang="pt-PT"
      preview={t('emails.feedback.preview', { kind: p.kind })}
      title={t('emails.feedback.title', { kind: p.kind })}
      note={t('emails.feedback.reply', { name: p.userName, email: p.userEmail })}
      footer={t('emails.feedback.footer')}
      openApp={t('emails.common.openApp')}
      appUrl={p.appUrl}
    >
      {p.message.split(/\n+/).map((line, i) => (
        <Text key={i} style={paragraphStyle}>
          {line}
        </Text>
      ))}
      <Text style={{ ...paragraphStyle, fontSize: 13, color: EMAIL_COLORS.muted }}>{meta.join(' · ')}</Text>
    </EmailLayout>
  );
}
