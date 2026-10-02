import { Text } from '@react-email/components';
import { EmailLayout, paragraphStyle } from './EmailLayout';
import { layoutTexts, type EmailBaseProps } from './shared';

export function ResetPassword(props: EmailBaseProps & { url: string }) {
  const { t, common } = layoutTexts(props);
  return (
    <EmailLayout {...common} preview={t('emails.reset.preview')} title={t('emails.reset.title')} button={{ label: t('emails.reset.button'), url: props.url }}>
      <Text style={paragraphStyle}>{t('emails.reset.body')}</Text>
      <Text style={paragraphStyle}>{t('emails.reset.expires')}</Text>
    </EmailLayout>
  );
}
