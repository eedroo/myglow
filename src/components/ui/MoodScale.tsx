'use client';

import type { MagicIconName } from '@/lib/icons';
import { MagicIcon } from './MagicIcon';

const FACES: MagicIconName[] = ['mood-1', 'mood-2', 'mood-3', 'mood-4', 'mood-5'];

interface MoodScaleProps {
  name: string;
  legend: string;
  /** Rótulos acessíveis de 1 a 5. */
  labels: [string, string, string, string, string];
  value: number | null;
  onChange: (value: number) => void;
}

/** Escala de humor 1–5 com caras; radiogroup nativo. */
export function MoodScale({ name, legend, labels, value, onChange }: MoodScaleProps) {
  return (
    <fieldset className="mg-mood">
      <legend className="mg-mood__legend">{legend}</legend>
      <div className="mg-mood__faces">
        {FACES.map((face, i) => {
          const v = i + 1;
          const selected = value === v;
          return (
            <label key={face} className={selected ? 'mg-mood__face mg-mood__face--selected' : 'mg-mood__face'}>
              <input
                className="mg-mood__input"
                type="radio"
                name={name}
                value={v}
                checked={selected}
                onChange={() => onChange(v)}
              />
              <MagicIcon name={face} size="md" label={labels[i] ?? String(v)} />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
