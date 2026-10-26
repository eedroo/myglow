'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { WeightInput } from '@/components/ui/WeightInput';
import { formatGramsAsKg } from '@/lib/weight';

/** Peso da semana: campo em kg ou, com body-pro e pesagens, a média só de leitura. */
export function StepWeight({
  title,
  help,
  grams,
  onCommit,
  average,
  unit,
  placeholder,
  averageLabel,
  openLabel,
  invalidLabel,
}: {
  title: string;
  help: string;
  grams: number | null;
  onCommit: (g: number | null) => void;
  average: { avgGrams: number; count: number } | null;
  unit: string;
  placeholder: string;
  averageLabel: string;
  openLabel: string;
  invalidLabel: string;
}) {
  const locale = useLocale();
  const [invalid, setInvalid] = useState(false);
  return (
    <div className="mg-step mg-step-weight">
      <label htmlFor="guided-weight" className="mg-step__title">
        {title}
      </label>
      {average ? (
        <>
          <p className="mg-step-weight__avg">{formatGramsAsKg(average.avgGrams, locale)} kg</p>
          <p className="mg-step__help">{averageLabel}</p>
          <Link href="/body/weight">{openLabel}</Link>
        </>
      ) : (
        <>
          <p className="mg-step__help">{help}</p>
          <WeightInput
            id="guided-weight"
            grams={grams}
            locale={locale}
            unitLabel={unit}
            placeholder={placeholder}
            onCommit={onCommit}
            onInvalid={setInvalid}
            invalid={invalid}
            describedBy={invalid ? 'guided-weight-error' : undefined}
          />
          {invalid && (
            <p id="guided-weight-error" className="mg-step__error" role="alert">
              {invalidLabel}
            </p>
          )}
        </>
      )}
    </div>
  );
}
