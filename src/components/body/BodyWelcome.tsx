'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { completeFitnessOnboarding } from '@/actions/fitness';
import { Button } from '@/components/ui/Button';
import { CheckChip } from '@/components/ui/CheckChip';
import { TextInput } from '@/components/ui/TextInput';
import { NotificationsPromptCard } from '@/components/notifications/NotificationsPromptCard';

const RESTS = [60, 90, 120, 180];
const STEPS = 4;

/** Onboarding do Foco no corpo: boas-vindas, descanso, aviso de fim de descanso e como começar. */
export function BodyWelcome({ initialRest, templates }: { initialRest: number; templates: { id: string; name: string; description: string }[] }) {
  const t = useTranslations('fitness.welcome');
  const te = useTranslations();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [rest, setRest] = useState(initialRest);
  const [custom, setCustom] = useState(RESTS.includes(initialRest) ? '' : String(initialRest));
  const [alert, setAlert] = useState(true);
  const [template, setTemplate] = useState<string | null>('ppl');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const finish = () =>
    start(async () => {
      const res = await completeFitnessOnboarding({ defaultRestSec: rest, restAlert: alert, templateId: template });
      if (!res.ok) return setError(te(res.error));
      router.push('/body');
    });

  return (
    <div className="mg-body-welcome">
      <div className="mg-body-welcome__progress" aria-hidden="true">
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={i <= step ? 'mg-body-welcome__dot mg-body-welcome__dot--done' : 'mg-body-welcome__dot'} />
        ))}
      </div>

      {step === 0 && (
        <section className="mg-body-welcome__step" aria-live="polite">
          <h2 className="mg-body-welcome__title">{t('hello')}</h2>
          <p className="mg-body-welcome__text">{t('helloText')}</p>
        </section>
      )}

      {step === 1 && (
        <section className="mg-body-welcome__step" aria-live="polite">
          <h2 className="mg-body-welcome__title">{t('restTitle')}</h2>
          <div className="mg-body-welcome__options" role="radiogroup" aria-label={t('restTitle')}>
            {RESTS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={rest === s && !custom}
                className={rest === s && !custom ? 'mg-body-welcome__option mg-body-welcome__option--active' : 'mg-body-welcome__option'}
                onClick={() => {
                  setRest(s);
                  setCustom('');
                }}
              >
                <strong>{t('seconds', { n: s })}</strong>
              </button>
            ))}
          </div>
          <label className="mg-body-welcome__text">
            {t('restOther')}
            <TextInput
              inputMode="numeric"
              value={custom}
              placeholder="75"
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustom(v);
                const n = Number(v);
                if (n >= 10 && n <= 900) setRest(n);
              }}
            />
          </label>
          <p className="mg-body-welcome__text">{t('restHint')}</p>
        </section>
      )}

      {step === 2 && (
        <section className="mg-body-welcome__step" aria-live="polite">
          <h2 className="mg-body-welcome__title">{t('alertTitle')}</h2>
          <p className="mg-body-welcome__text">{t('alertText')}</p>
          <CheckChip icon="sparkles" label={t('alertToggle')} checked={alert} onCheckedChange={setAlert} />
          {alert && <NotificationsPromptCard />}
        </section>
      )}

      {step === 3 && (
        <section className="mg-body-welcome__step" aria-live="polite">
          <h2 className="mg-body-welcome__title">{t('startTitle')}</h2>
          <div className="mg-body-welcome__options" role="radiogroup" aria-label={t('startTitle')}>
            {[...templates, { id: '', name: t('fromScratch'), description: t('fromScratchText') }].map((tpl) => {
              const active = (template ?? '') === tpl.id;
              return (
                <button
                  key={tpl.id || 'scratch'}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={active ? 'mg-body-welcome__option mg-body-welcome__option--active' : 'mg-body-welcome__option'}
                  onClick={() => setTemplate(tpl.id || null)}
                >
                  <strong>{tpl.name}</strong>
                  <span>{tpl.description}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {error && (
        <p className="mg-set-input__error" role="alert">
          {error}
        </p>
      )}

      <div className="mg-body-welcome__actions">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            {t('back')}
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS - 1 ? (
          <Button className="mg-btn--body" onClick={() => setStep(step + 1)}>
            {t('next')}
          </Button>
        ) : (
          <Button className="mg-btn--body" loading={pending} onClick={finish}>
            {t('finish')}
          </Button>
        )}
      </div>
    </div>
  );
}
