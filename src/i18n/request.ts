import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isAppLocale, localeFromAcceptLanguage, type AppLocale } from './locales';

/** Locale: cookie NEXT_LOCALE → Accept-Language → pt-PT. Sem prefixo no URL. */
export async function resolveLocale(): Promise<AppLocale> {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  if (isAppLocale(cookieLocale)) return cookieLocale;
  const accept = headers().get('accept-language');
  return accept ? localeFromAcceptLanguage(accept) : DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: 'UTC',
  };
});
