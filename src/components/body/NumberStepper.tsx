'use client';

import { useTranslations } from 'next-intl';

interface Props {
  label: string;
  kind: 'reps' | 'kg' | 'time';
  value: string;
  onChange: (v: string) => void;
  step: number;
  min?: number;
  max: number;
  /** "decimal" para kg (vírgula ou ponto). */
  decimal?: boolean;
}

const toNum = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** − / valor (teclado numérico ao tocar) / +. */
export function NumberStepper({ label, kind, value, onChange, step, min = 0, max, decimal = false }: Props) {
  const t = useTranslations('fitness.session');
  const fmt = (n: number) => {
    const r = Math.round(Math.min(max, Math.max(min, n)) * 1000) / 1000;
    return decimal ? String(r).replace('.', value.includes(',') || !value.includes('.') ? ',' : '.') : String(Math.round(r));
  };
  return (
    <div className={`mg-stepper mg-stepper--${kind}`}>
      <span className="mg-stepper__label">{label}</span>
      <div className="mg-stepper__row">
        <button type="button" className="mg-stepper__btn" aria-label={t('minus', { label, step })} onClick={() => onChange(fmt(toNum(value) - step))}>
          −
        </button>
        <input
          className="mg-stepper__value"
          inputMode={decimal ? 'decimal' : 'numeric'}
          aria-label={label}
          value={value}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChange(e.target.value.replace(decimal ? /[^\d.,]/g : /[^\d]/g, '').slice(0, 7))}
        />
        <button type="button" className="mg-stepper__btn" aria-label={t('plus', { label, step })} onClick={() => onChange(fmt(toNum(value) + step))}>
          +
        </button>
      </div>
    </div>
  );
}
