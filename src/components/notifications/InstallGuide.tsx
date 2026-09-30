'use client';

import { useTranslations } from 'next-intl';
import { Share, SquarePlus, Smartphone } from 'lucide-react';

/** iPhone/iPad: os lembretes só funcionam com a app instalada no ecrã principal. */
export function InstallGuide() {
  const t = useTranslations('notifications.install');
  const steps = [
    { icon: Share, text: t('step1') },
    { icon: SquarePlus, text: t('step2') },
    { icon: Smartphone, text: t('step3') },
  ];
  return (
    <div className="mg-install">
      <p className="mg-install__intro">{t('iosIntro')}</p>
      <ol className="mg-install__steps">
        {steps.map(({ icon: Icon, text }, i) => (
          <li key={i} className="mg-install__step">
            <span className="mg-install__num" aria-hidden="true">
              {i + 1}
            </span>
            <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
