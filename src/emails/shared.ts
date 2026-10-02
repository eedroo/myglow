import type { Locale } from '@prisma/client';
import { dbToAppLocale } from '@/i18n/locales';
import { translatorFor } from '@/i18n/translator';

/** Dados comuns a todos os emails: língua do utilizador, nome e URL da app. */
export interface EmailBaseProps {
  locale: Locale;
  name: string;
  appUrl: string;
}

/** Textos comuns do `EmailLayout`, já traduzidos. */
export function layoutTexts({ locale, name, appUrl }: EmailBaseProps) {
  const t = translatorFor(locale);
  return {
    t,
    common: {
      lang: dbToAppLocale(locale),
      greeting: t('emails.common.greeting', { name }),
      linkFallback: t('emails.common.linkFallback'),
      note: t('emails.common.ignore'),
      footer: t('emails.common.footer'),
      openApp: t('emails.common.openApp'),
      appUrl,
    },
  };
}
