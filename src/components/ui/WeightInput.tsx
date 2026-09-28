'use client';

import { useEffect, useState } from 'react';
import { formatGramsAsKg, parseKgToGrams } from '@/lib/weight';

interface WeightInputProps {
  id: string;
  grams: number | null;
  locale: string;
  unitLabel: string;
  placeholder?: string;
  /** Chamado no blur com um valor válido diferente do actual. */
  onCommit: (grams: number | null) => void;
  /** Chamado no blur quando o texto não é um peso válido (null = voltou a ser válido). */
  onInvalid: (invalid: boolean) => void;
  invalid?: boolean;
  describedBy?: string;
}

/** Peso em kg: aceita vírgula ou ponto; valida no blur. */
export function WeightInput({ id, grams, locale, unitLabel, placeholder, onCommit, onInvalid, invalid, describedBy }: WeightInputProps) {
  const [text, setText] = useState(grams === null ? '' : formatGramsAsKg(grams, locale));

  useEffect(() => {
    setText(grams === null ? '' : formatGramsAsKg(grams, locale));
  }, [grams, locale]);

  function commit() {
    let parsed: number | null;
    try {
      parsed = parseKgToGrams(text);
    } catch {
      onInvalid(true);
      return;
    }
    if (parsed !== null && (parsed < 20_000 || parsed > 400_000)) {
      onInvalid(true);
      return;
    }
    onInvalid(false);
    if (parsed !== grams) onCommit(parsed);
    setText(parsed === null ? '' : formatGramsAsKg(parsed, locale));
  }

  return (
    <span className="mg-weight-input">
      <input
        id={id}
        className="mg-weight-input__field"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      <span className="mg-weight-input__unit" aria-hidden="true">
        {unitLabel}
      </span>
    </span>
  );
}
