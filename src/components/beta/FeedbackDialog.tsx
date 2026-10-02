'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { FeedbackKind } from '@prisma/client';
import { sendFeedback } from '@/actions/feedback';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

const KINDS: FeedbackKind[] = ['BUG', 'IDEA', 'PRAISE', 'OTHER'];

interface FeedbackDialogProps {
  /** `link`: link discreto (rodapé do /today); por defeito botão. */
  variant?: 'button' | 'link';
}

/** "Enviar feedback": tipo + mensagem → `sendFeedback`. */
export function FeedbackDialog({ variant = 'button' }: FeedbackDialogProps) {
  const t = useTranslations('feedback');
  const tc = useTranslations();
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<FeedbackKind>('IDEA');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const open = () => {
    setSent(false);
    setError(null);
    ref.current?.showModal();
  };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await sendFeedback({ kind, message, path: pathname.slice(0, 200) });
      if (!res.ok) return setError(res.error);
      setError(null);
      setMessage('');
      setSent(true);
    });
  }

  return (
    <span className="mg-feedback">
      {variant === 'link' ? (
        <button type="button" className="mg-feedback--link" onClick={open}>
          {t('open')}
        </button>
      ) : (
        <Button variant="ghost" onClick={open}>
          {t('open')}
        </Button>
      )}
      <dialog ref={ref} className="mg-feedback__dialog" aria-labelledby="feedback-title">
        <h2 id="feedback-title" className="mg-feedback__title">
          {t('title')}
        </h2>
        {sent ? (
          <>
            <p className="mg-feedback__thanks" role="status">
              {t('thanks')}
            </p>
            <div className="mg-feedback__actions">
              <Button onClick={() => ref.current?.close()} autoFocus>
                {tc('common.close')}
              </Button>
            </div>
          </>
        ) : (
          <form className="mg-feedback__form" onSubmit={onSubmit} noValidate>
            <SegmentedControl<FeedbackKind>
              name="feedback-kind"
              legend={t('kind')}
              value={kind}
              onChange={setKind}
              options={KINDS.map((value) => ({ value, label: t(`kinds.${value}`) }))}
            />
            <div className="mg-field">
              <label className="mg-field__label" htmlFor="feedback-message">
                {t('message')}
              </label>
              <textarea
                id="feedback-message"
                className="mg-input mg-feedback__message"
                rows={5}
                minLength={5}
                maxLength={2000}
                value={message}
                placeholder={t('placeholder')}
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={!!error || undefined}
                required
              />
            </div>
            {error && (
              <p className="mg-form-error" role="alert">
                {tc(error)}
              </p>
            )}
            <div className="mg-feedback__actions">
              <Button variant="ghost" onClick={() => ref.current?.close()} disabled={pending}>
                {tc('common.cancel')}
              </Button>
              <Button type="submit" loading={pending} disabled={message.trim().length < 5}>
                {t('send')}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </span>
  );
}
