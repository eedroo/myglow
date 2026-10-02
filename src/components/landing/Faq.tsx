import Link from 'next/link';
import { useTranslations } from 'next-intl';

const QUESTIONS = ['free', 'astrology', 'privacy', 'devices', 'beta'] as const;

export function Faq() {
  const t = useTranslations('landing.faq');
  return (
    <section className="mg-landing__section" aria-labelledby="landing-faq-title">
      <div className="mg-landing__inner">
        <h2 id="landing-faq-title" className="mg-landing__title">
          {t('title')}
        </h2>
        <div className="mg-faq">
          {QUESTIONS.map((q) => (
            <details key={q} className="mg-faq__item">
              <summary className="mg-faq__question">{t(`${q}.q`)}</summary>
              <p className="mg-faq__answer">
                {t(`${q}.a`)}
                {q === 'privacy' && (
                  <>
                    {' '}
                    <Link href="/privacy">{t('privacyLink')}</Link>
                  </>
                )}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
