import { Text } from '@react-email/components';
import { EmailLayout, paragraphStyle } from './EmailLayout';
import { layoutTexts, type EmailBaseProps } from './shared';

/** Enviado para o email NOVO. */
export function EmailChangeConfirm(props: EmailBaseProps & { url: string; newEmail: string }) {
  const { t, common } = layoutTexts(props);
  return (
    <EmailLayout
      {...common}
      preview={t('emails.emailChangeConfirm.preview')}
      title={t('emails.emailChangeConfirm.title')}
      button={{ label: t('emails.emailChangeConfirm.button'), url: props.url }}
    >
      <Text style={paragraphStyle}>{t('emails.emailChangeConfirm.body', { email: props.newEmail })}</Text>
      <Text style={paragraphStyle}>{t('emails.emailChangeConfirm.expires')}</Text>
    </EmailLayout>
  );
}
