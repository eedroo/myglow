'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { deleteWeight } from '@/actions/body';
import { formatLongDate } from '@/lib/dates';
import { formatGramsAsKg } from '@/lib/weight';
import type { WeightPoint } from '@/lib/body/weight';
import { isAppLocale, intlLocale } from '@/i18n/locales';

const REVEAL = 96;

function Row({ point }: { point: WeightPoint }) {
  const t = useTranslations('body.weight');
  const raw = useLocale();
  const locale = isAppLocale(raw) ? raw : 'pt-PT';
  const router = useRouter();
  const [dx, setDx] = useState(0);
  const [pending, start] = useTransition();
  const startX = useRef<number | null>(null);
  const remove = () =>
    start(async () => {
      await deleteWeight(point.date);
      router.refresh();
    });
  return (
    <li className="mg-weight-list__item">
      <button type="button" className="mg-weight-list__delete" onClick={remove} disabled={pending} tabIndex={dx ? 0 : -1} aria-label={t('deleteEntry', { date: point.date })}>
        {t('delete')}
      </button>
      <div
        className="mg-weight-list__row"
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerMove={(e) => {
          if (startX.current == null) return;
          const d = Math.min(0, Math.max(-REVEAL, e.clientX - startX.current + (dx === -REVEAL ? -REVEAL : 0)));
          if (Math.abs(d) > 8) setDx(d);
        }}
        onPointerUp={() => {
          startX.current = null;
          setDx((d) => (d < -REVEAL / 2 ? -REVEAL : 0));
        }}
        onPointerCancel={() => (startX.current = null)}
      >
        <span>{formatLongDate(point.date, locale)}</span>
        <span className="mg-weight-list__kg">{t('kg', { kg: formatGramsAsKg(point.grams, intlLocale(locale)) })}</span>
      </div>
    </li>
  );
}

/** Registos, mais recentes primeiro; deslizar para a esquerda mostra "Apagar". */
export function WeightList({ points }: { points: WeightPoint[] }) {
  const t = useTranslations('body.weight');
  if (!points.length) return <p className="mg-body-empty">{t('noEntries')}</p>;
  return (
    <ul className="mg-weight-list" aria-label={t('entries')}>
      {[...points].reverse().map((p) => (
        <Row key={p.date} point={p} />
      ))}
    </ul>
  );
}
