'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LOCALES, LOCALE_COOKIE, type AppLocale } from '@/i18n/locales';

const SHORT: Record<AppLocale, string> = { 'pt-PT': 'PT', 'pt-BR': 'BR', en: 'EN' };

/** PT · BR · EN: grava o cookie NEXT_LOCALE e volta a renderizar a página na nova língua. */
export function LocaleSwitcher() {
  const t = useTranslations('landing.locale');
  const current = useLocale();
  const router = useRouter();
  const choose = (l: AppLocale) => {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  };
  return (
    <div className="mg-locale-switcher" role="group" aria-label={t('label')}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          className={l === current ? 'mg-locale-switcher__option mg-locale-switcher__option--active' : 'mg-locale-switcher__option'}
          aria-pressed={l === current}
          aria-label={t(l)}
          onClick={() => choose(l)}
        >
          {SHORT[l]}
        </button>
      ))}
    </div>
  );
}
