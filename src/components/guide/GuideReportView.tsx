import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { formatDayMonth, type DateISO } from '@/lib/dates';
import { PROJECT_ICONS } from '@/lib/icons';
import type { AppLocale } from '@/i18n/locales';
import type { GuideReportPayload } from '@/lib/guide/schema';

/** Datas em que a leitura se baseia: etiquetas que abrem o dia no diário. */
async function Evidence({ dates, locale }: { dates: DateISO[]; locale: AppLocale }) {
  if (!dates.length) return null;
  const t = await getTranslations('guide.report');
  return (
    <span className="mg-guide-report__evidence" aria-label={t('evidenceLabel')}>
      {dates.map((d) => (
        <Link key={d} href={`/day/${d}`} className="mg-guide-report__date">
          {formatDayMonth(d, locale)}
        </Link>
      ))}
    </span>
  );
}

/** A leitura do Guia. Os estados das áreas não têm cores de bom/mau. */
export async function GuideReportView({ report, locale }: { report: GuideReportPayload; locale: AppLocale }) {
  const [t, tp] = await Promise.all([getTranslations('guide.report'), getTranslations('projects.areas')]);
  return (
    <div className="mg-guide-report">
      <p className="mg-guide-report__opening">{report.opening}</p>

      <section className="mg-guide-report__section" aria-labelledby="guide-continue">
        <h2 id="guide-continue" className="mg-guide-report__heading">{t('continue')}</h2>
        <ul className="mg-guide-report__list">
          {report.continue.map((x) => (
            <li key={x.title} className="mg-guide-report__item">
              <h3 className="mg-guide-report__item-title">{x.title}</h3>
              <p className="mg-guide-report__item-text">{x.detail}</p>
              <Evidence dates={x.evidence} locale={locale} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mg-guide-report__section" aria-labelledby="guide-improve">
        <h2 id="guide-improve" className="mg-guide-report__heading">{t('improve')}</h2>
        <ul className="mg-guide-report__list">
          {report.improve.map((x) => (
            <li key={x.title} className="mg-guide-report__item">
              <h3 className="mg-guide-report__item-title">{x.title}</h3>
              <p className="mg-guide-report__item-text">{x.detail}</p>
              <Evidence dates={x.evidence} locale={locale} />
            </li>
          ))}
        </ul>
      </section>

      {report.patterns.length > 0 && (
        <section className="mg-guide-report__section" aria-labelledby="guide-patterns">
          <h2 id="guide-patterns" className="mg-guide-report__heading">{t('patterns')}</h2>
          <ul className="mg-guide-report__list">
            {report.patterns.map((x) => (
              <li key={x.text} className="mg-guide-report__item">
                <p className="mg-guide-report__item-text">{x.text}</p>
                <Evidence dates={x.evidence} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.areas.length > 0 && (
        <section className="mg-guide-report__section" aria-labelledby="guide-areas">
          <h2 id="guide-areas" className="mg-guide-report__heading">{t('areas')}</h2>
          <ul className="mg-guide-report__list">
            {report.areas.map((a) => (
              <li key={a.area} className="mg-guide-report__item">
                <span className="mg-guide-report__area">
                  <MagicIcon name={PROJECT_ICONS[a.area]} size="sm" decorative />
                  <span className="mg-guide-report__item-title">{tp(a.area)}</span>
                  <span className="mg-guide-report__status">{t(`status.${a.status}`)}</span>
                </span>
                <p className="mg-guide-report__item-text">{a.observed}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mg-guide-report__section" aria-labelledby="guide-focuses">
        <h2 id="guide-focuses" className="mg-guide-report__heading">{t('focuses')}</h2>
        <ol className="mg-guide-report__list">
          {report.focuses.map((f, i) => (
            <li key={f.title} className="mg-guide-report__item mg-guide-report__focus">
              <span className="mg-guide-report__number" aria-hidden="true">{i + 1}</span>
              <h3 className="mg-guide-report__item-title">{f.title}</h3>
              <p className="mg-guide-report__item-text">{f.why}</p>
              <p className="mg-guide-report__item-text">{t('action', { action: f.action })}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="mg-guide-report__encouragement">{report.encouragement}</p>
    </div>
  );
}
