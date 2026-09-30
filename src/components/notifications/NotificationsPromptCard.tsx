'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { currentSubscription, detectPushSupport, subscribePush, type PushSupport } from '@/lib/push/client';
import { PROMPT_DISMISS_COOKIE, PROMPT_DISMISS_DAYS } from '@/lib/notifications/prompt';
import { InstallGuide } from './InstallGuide';

type Phase = 'hidden' | 'ask' | 'ios' | 'enabling' | 'done' | 'denied' | 'error';

/**
 * Convite em /today para activar os lembretes. Nunca pede permissão sozinho: só depois de "Activar".
 * Some se o dispositivo já estiver subscrito, se não houver suporte ou se o utilizador dispensar (14 dias).
 */
export function NotificationsPromptCard() {
  const t = useTranslations('notifications.prompt');
  const ti = useTranslations('notifications.install');
  const [phase, setPhase] = useState<Phase>('hidden');

  useEffect(() => {
    let cancelled = false;
    const support: PushSupport = detectPushSupport();
    if (support === 'ios-needs-install') return setPhase('ios');
    if (support !== 'supported') return;
    void currentSubscription().then((sub) => {
      if (!cancelled && !sub) setPhase('ask');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === 'hidden') return null;

  const dismiss = () => {
    document.cookie = `${PROMPT_DISMISS_COOKIE}=1; max-age=${PROMPT_DISMISS_DAYS * 86_400}; path=/; samesite=lax`;
    setPhase('hidden');
  };

  const enable = async () => {
    setPhase('enabling');
    const ok = await subscribePush();
    if (ok) return setPhase('done');
    setPhase(typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'denied' : 'error');
  };

  return (
    <GlassCard className="mg-notify-prompt" aria-labelledby="notify-prompt-title">
      <span className="mg-notify-prompt__icon">
        <MagicIcon name="moon-stars" size="lg" decorative />
      </span>
      <div className="mg-notify-prompt__body">
        <h2 id="notify-prompt-title" className="mg-notify-prompt__title">
          {phase === 'ios' ? ti('title') : t('title')}
        </h2>
        {phase === 'ios' ? <InstallGuide /> : <p className="mg-notify-prompt__text">{t('body')}</p>}
        <p className="mg-notify-prompt__status" role="status" aria-live="polite">
          {phase === 'done' && t('enabled')}
          {phase === 'denied' && t('denied')}
          {phase === 'error' && t('error')}
        </p>
        {phase !== 'done' && (
          <div className="mg-notify-prompt__actions">
            {(phase === 'ask' || phase === 'enabling' || phase === 'error') && (
              <Button onClick={enable} loading={phase === 'enabling'} loadingLabel={t('enabling')}>
                {t('enable')}
              </Button>
            )}
            <Button variant="subtle" onClick={dismiss}>
              {t('dismiss')}
            </Button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
