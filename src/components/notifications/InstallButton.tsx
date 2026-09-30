'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { isStandalone } from '@/lib/push/client';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Android/desktop: "Instalar MYGLOW" com o `beforeinstallprompt` guardado; nada em standalone. */
export function InstallButton() {
  const t = useTranslations('notifications.install');
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!event) return null;
  return (
    <Button
      variant="ghost"
      className="mg-install-btn"
      onClick={async () => {
        await event.prompt();
        await event.userChoice.catch(() => undefined);
        setEvent(null);
      }}
    >
      <MagicIcon name="moon-crescent" size="sm" decorative />
      {t('button')}
    </Button>
  );
}
