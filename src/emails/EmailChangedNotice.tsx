import { Text } from '@react-email/components';
import { EmailLayout, paragraphStyle } from './EmailLayout';
import { layoutTexts, type EmailBaseProps } from './shared';

/** Enviado para o email ANTIGO depois da alteração. */
export function EmailChangedNotice(props: EmailBaseProps & { newEmail: string }) {
  const { t, common } = layoutTexts(props);
  return (
    <EmailLayout
      {...common}
      preview={t('emails.emailChangedNotice.preview')}
      title={t('emails.emailChangedNotice.title')}
      note={t('emails.emailChangedNotice.notYou')}
    >
      <Text style={paragraphStyle}>{t('emails.emailChangedNotice.body', { email: props.newEmail })}</Text>
    </EmailLayout>
  );
}
