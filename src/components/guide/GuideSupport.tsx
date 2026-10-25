import { getTranslations } from 'next-intl/server';
import type { SupportContact } from '@/lib/guide/safety';

/** Modo apoio: texto fixo, cuidadoso, com contactos de ajuda. Sem análise nem focos. */
export async function GuideSupport({ contacts }: { contacts: SupportContact[] }) {
  const t = await getTranslations('guide.support');
  return (
    <section className="mg-guide-support" aria-labelledby="guide-support-title">
      <h2 id="guide-support-title" className="mg-guide-consent__title">{t('title')}</h2>
      <p className="mg-guide-support__text">{t('text')}</p>
      <ul className="mg-guide-support__contacts">
        {contacts.map((c) => (
          <li key={c.label} className="mg-guide-support__contact">
            <span>{t(`contacts.${c.label}`)}</span>
            {c.href ? (
              <a
                className="mg-guide-support__value"
                href={c.href}
                {...(c.href.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {c.value}
              </a>
            ) : (
              <span className="mg-guide-support__value">{c.value}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mg-guide-support__text">{t('invite')}</p>
    </section>
  );
}
