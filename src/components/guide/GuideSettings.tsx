'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { withdrawGuideConsent } from '@/actions/guide';
import { Button } from '@/components/ui/Button';

interface GuideSettingsProps {
  /** Data do consentimento já formatada, ou `null` se desligado. */
  consentedOn: string | null;
  /** Onde activar (a leitura da semana passada mostra o consentimento). */
  activateHref: string;
}

/** Secção do Guia nas definições: estado, desligar e apagar todas as leituras. */
export function GuideSettings({ consentedOn, activateHref }: GuideSettingsProps) {
  const t = useTranslations('guide.settings');
  const tg = useTranslations('guide');
  const router = useRouter();
  const [deleteReports, setDeleteReports] = useState(false);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const name = tg('name');

  if (!consentedOn) {
    return (
      <div className="mg-guide-consent">
        <p className="mg-form__status">{done ? t('deactivated', { name }) : t('off', { name })}</p>
        <div className="mg-guide-consent__actions">
          <Link href={activateHref} className="mg-btn mg-btn--subtle">
            {t('activate', { name })}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mg-guide-consent">
      <p className="mg-form__status">{t('on', { name, date: consentedOn })}</p>
      <label className="mg-guide-consent__check">
        <input type="checkbox" checked={deleteReports} onChange={(e) => setDeleteReports(e.target.checked)} />
        <span>{t('deleteReports')}</span>
      </label>
      <div className="mg-guide-consent__actions">
        <Button
          variant="ghost"
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await withdrawGuideConsent(deleteReports);
              if (res.ok) {
                setDone(true);
                router.refresh();
              }
            })
          }
        >
          {t('deactivate', { name })}
        </Button>
      </div>
    </div>
  );
}
