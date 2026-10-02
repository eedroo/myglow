import { Text } from '@react-email/components';
import { EmailLayout, paragraphStyle } from './EmailLayout';
import { layoutTexts, type EmailBaseProps } from './shared';

export function VerifyEmail(props: EmailBaseProps & { url: string }) {
  const { t, common } = layoutTexts(props);
  return (
    <EmailLayout {...common} preview={t('emails.verify.preview')} title={t('emails.verify.title')} button={{ label: t('emails.verify.button'), url: props.url }}>
      <Text style={paragraphStyle}>{t('emails.verify.body')}</Text>
      <Text style={paragraphStyle}>{t('emails.verify.expires')}</Text>
    </EmailLayout>
  );
}
