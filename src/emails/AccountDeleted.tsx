import { Text } from '@react-email/components';
import { EmailLayout, paragraphStyle } from './EmailLayout';
import { layoutTexts, type EmailBaseProps } from './shared';

export function AccountDeleted(props: EmailBaseProps) {
  const { t, common } = layoutTexts(props);
  return (
    <EmailLayout {...common} preview={t('emails.accountDeleted.preview')} title={t('emails.accountDeleted.title')}>
      <Text style={paragraphStyle}>{t('emails.accountDeleted.body')}</Text>
      <Text style={paragraphStyle}>{t('emails.accountDeleted.thanks')}</Text>
    </EmailLayout>
  );
}
