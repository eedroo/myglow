import { Text } from '@react-email/components';
import { EmailLayout, paragraphStyle } from './EmailLayout';
import { layoutTexts, type EmailBaseProps } from './shared';

export function PasswordChanged(props: EmailBaseProps) {
  const { t, common } = layoutTexts(props);
  return (
    <EmailLayout
      {...common}
      preview={t('emails.passwordChanged.preview')}
      title={t('emails.passwordChanged.title')}
      note={t('emails.passwordChanged.notYou')}
    >
      <Text style={paragraphStyle}>{t('emails.passwordChanged.body')}</Text>
    </EmailLayout>
  );
}
