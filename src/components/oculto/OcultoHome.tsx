import Link from 'next/link';
import { Check, Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { OcultoState } from '@/lib/oculto/server';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { OcultoReviewPanel } from './OcultoReviewPanel';

/** `/oculto`: onde a pessoa está no treino, a próxima sessão, a semana e o caminho das 6 fases. */
export async function OcultoHome({ state }: { state: OcultoState }) {
  const t = await getTranslations('oculto');
  const { program, content, status, week } = state;
  const phase = program.phases.find((p) => p.weeks.includes(week));
  const next = content?.sessions.find((s) => s.day === status.next) ?? null;
  const waiting = state.currentReview?.result === 'ADVANCE';

  return (
    <div className="mg-oculto">
      <header className="mg-oculto__hero">
        <MagicIcon name="constellation" size="lg" decorative />
        <p className="mg-oculto__eyebrow">{t('eyebrow')}</p>
        <h1 className="mg-oculto__title">{program.title}</h1>
        <p className="mg-oculto__text">{program.subtitle}</p>
      </header>

      {content ? (
        <>
          <section className="mg-oculto__section">
            <p className="mg-oculto__eyebrow">
              {t('where', { phase: phase?.phase ?? 1, phaseTitle: phase?.title ?? '', week })}
              {state.attempt > 1 && ` · ${t('attempt', { n: state.attempt })}`}
            </p>
            <h2 className="mg-oculto__title">{content.title}</h2>
            <p className="mg-oculto__text">{content.subtitle} · {content.competence}</p>
            {waiting ? (
              <p className="mg-oculto__text">{t('waitingNext')}</p>
            ) : status.reviewReady && !status.canPractice ? (
              <OcultoReviewPanel week={week} />
            ) : status.canPractice && next ? (
              <Link href="/oculto/sessao" className="mg-btn mg-btn--primary mg-btn--block mg-oculto__cta">
                {t('startSession', { day: next.day, title: next.title, minutes: next.mainMinutes })}
              </Link>
            ) : (
              <p className="mg-oculto__text">{t('comeBack')}</p>
            )}
            {status.reviewReady && status.canPractice && !waiting && (
              <details className="mg-oculto__more">
                <summary>{t('reviewEarly')}</summary>
                <OcultoReviewPanel week={week} />
              </details>
            )}
          </section>

          <section className="mg-oculto__section">
            <h2 className="mg-oculto__subtitle">{t('aboutWeek')}</h2>
            {content.intro.map((p) => (
              <p key={p} className="mg-oculto__text">{p}</p>
            ))}
            <p className="mg-oculto__text"><strong>{t('objective')}</strong> {content.objective}</p>
          </section>

          <section className="mg-oculto__section">
            <h2 className="mg-oculto__subtitle">{t('sessions')}</h2>
            <ol className="mg-oculto__sessions">
              {content.sessions.map((s) => {
                const done = status.done.includes(s.day);
                const isNext = s.day === status.next;
                return (
                  <li key={s.day} className={['mg-oculto__session', done && 'mg-oculto__session--done', isNext && 'mg-oculto__session--next'].filter(Boolean).join(' ')}>
                    <span className="mg-oculto__mark" aria-hidden="true">{done ? <Check size={14} /> : s.day}</span>
                    <span className="mg-oculto__session-text">
                      <span>{s.title}</span>
                      <span className="mg-oculto__meta">{t('minutes', { n: s.mainMinutes })}{done ? ` · ${t('done')}` : ''}</span>
                    </span>
                  </li>
                );
              })}
              <li className="mg-oculto__session mg-oculto__session--rest">
                <span className="mg-oculto__mark" aria-hidden="true">6</span>
                <span className="mg-oculto__session-text"><span>{t('reviewDay')}</span></span>
              </li>
              <li className="mg-oculto__session mg-oculto__session--rest">
                <span className="mg-oculto__mark" aria-hidden="true">7</span>
                <span className="mg-oculto__session-text"><span>{t('restDay')}</span></span>
              </li>
            </ol>
          </section>

          <section className="mg-oculto__section">
            <h2 className="mg-oculto__subtitle">{t('challenges')}</h2>
            <ul className="mg-oculto__list">
              {content.challenges.map((c) => (
                <li key={c.title}><strong>{c.title}.</strong> {c.text}</li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <section className="mg-oculto__section">
          <p className="mg-oculto__text">{t('soon')}</p>
        </section>
      )}

      <section className="mg-oculto__section">
        <h2 className="mg-oculto__subtitle">{t('path')}</h2>
        <ol className="mg-oculto__phases">
          {program.phases.map((p) => {
            const current = p.weeks.includes(week);
            const locked = !p.weeks.some((w) => state.available.includes(w));
            return (
              <li key={p.phase} className={['mg-oculto__phase', current && 'mg-oculto__phase--current', locked && 'mg-oculto__phase--locked'].filter(Boolean).join(' ')}>
                <span className="mg-oculto__mark" aria-hidden="true">{locked ? <Lock size={12} /> : p.phase}</span>
                <span className="mg-oculto__session-text">
                  <span>{p.title} · {p.source}</span>
                  <span className="mg-oculto__meta">{t('phaseWeeks', { from: p.weeks[0]!, to: p.weeks[p.weeks.length - 1]! })} · {locked ? t('soonShort') : p.goal}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mg-oculto__care">
        {program.care.map((c) => (
          <p key={c}>{c}</p>
        ))}
      </section>
    </div>
  );
}
