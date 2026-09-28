'use client';

import { useState } from 'react';

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
}

interface SegmentedControlProps<V extends string> {
  name: string;
  legend: string;
  options: SegmentedOption<V>[];
  /** Controlado. */
  value?: V;
  /** Não controlado. */
  defaultValue?: V;
  onChange?: (value: V) => void;
  hideLegend?: boolean;
  className?: string;
}

/** Radiogroup nativo com aspecto de pílula (teclado ← → incluído). */
export function SegmentedControl<V extends string>({
  name,
  legend,
  options,
  value,
  defaultValue,
  onChange,
  hideLegend,
  className,
}: SegmentedControlProps<V>) {
  const [internal, setInternal] = useState<V | undefined>(defaultValue);
  const current = value ?? internal;

  return (
    <fieldset className={className ? `mg-segmented ${className}` : 'mg-segmented'}>
      <legend className={hideLegend ? 'mg-visually-hidden' : 'mg-segmented__legend'}>{legend}</legend>
      <div className="mg-segmented__track">
        {options.map((opt) => {
          const active = opt.value === current;
          return (
            <label
              key={opt.value}
              className={active ? 'mg-segmented__option mg-segmented__option--active' : 'mg-segmented__option'}
            >
              <input
                className="mg-segmented__input"
                type="radio"
                name={name}
                value={opt.value}
                checked={active}
                onChange={() => {
                  setInternal(opt.value);
                  onChange?.(opt.value);
                }}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
