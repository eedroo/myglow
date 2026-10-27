'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { markAnnouncementSeen } from '@/actions/announcements';
import { SlidePlayer, type Slide } from '@/components/slides/SlidePlayer';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { Button } from '@/components/ui/Button';
import type { MagicIconName } from '@/lib/icons';

const SLIDES: { id: string; icon: MagicIconName; bodyPro?: boolean }[] = [
  { id: 'hello', icon: 'sparkles' },
  { id: 'guided', icon: 'moon-stars' },
  { id: 'journey', icon: 'constellation' },
  { id: 'recap', icon: 'scroll' },
  { id: 'friends', icon: 'heart' },
  { id: 'body', icon: 'dumbbell', bodyPro: true },
  { id: 'start', icon: 'glow-orb' },
];

/** F19: "Chegou a MYGLOW v2" em slides, uma vez, a quem já usava a app (depois de o admin publicar o anúncio). */
export function WhatsNew({ stage, bodyPro }: { stage: number; bodyPro: boolean }) {
  const t = useTranslations('whatsNew.v2');
  const tg = useTranslations('guided.labels');
  const router = useRouter();
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const close = () => {
    setOpen(false);
    void markAnnouncementSeen('v2')
      .catch(() => undefined)
      .then(() => router.refresh());
  };
  const visible = SLIDES.filter((s) => !s.bodyPro || bodyPro);
  const slides: Slide[] = visible.map((s, i) => ({
    id: s.id,
    interactive: false,
    title: t(`${s.id}.title`),
    content: (
      <div className="mg-step mg-whats-new-v2">
        <span className={i === 0 ? 'mg-whats-new-v2__icon mg-unlock__glow' : 'mg-whats-new-v2__icon'}>
          <MagicIcon name={s.icon} size={i === 0 ? 'xl' : 'lg'} decorative />
        </span>
        <h2 className="mg-step__title mg-whats-new-v2__title">{t(`${s.id}.title`)}</h2>
        <p className="mg-whats-new-v2__text">{t(`${s.id}.text`, { n: stage })}</p>
        {i === visible.length - 1 && <Button onClick={close}>{t('start.cta')}</Button>}
      </div>
    ),
  }));

  return (
    <SlidePlayer
      slides={slides}
      theme="guided"
      className="mg-whats-new-v2-player"
      label={t('label')}
      closeLabel={t('close')}
      onClose={close}
      labels={{ prev: tg('back'), next: tg('continue'), back: tg('back'), skip: tg('skip'), continue: tg('continue') }}
    />
  );
}
