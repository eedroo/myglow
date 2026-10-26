'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp } from 'lucide-react';

/** Subir e descer um elemento numa lista; `onReorder` recebe a nova ordem de ids. */
export function ReorderButtons({ ids, index, onReorder }: { ids: string[]; index: number; onReorder: (order: string[]) => Promise<unknown> }) {
  const t = useTranslations('fitness');
  const router = useRouter();
  const [pending, start] = useTransition();
  const move = (to: number) =>
    start(async () => {
      const next = [...ids];
      const [x] = next.splice(index, 1);
      next.splice(to, 0, x!);
      await onReorder(next);
      router.refresh();
    });
  return (
    <span className="mg-reorder">
      <button type="button" className="mg-icon-btn" aria-label={t('moveUp')} disabled={pending || index === 0} onClick={() => move(index - 1)}>
        <ArrowUp size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <button type="button" className="mg-icon-btn" aria-label={t('moveDown')} disabled={pending || index === ids.length - 1} onClick={() => move(index + 1)}>
        <ArrowDown size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </span>
  );
}
