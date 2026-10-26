'use client';

import { MoodScale } from '@/components/ui/MoodScale';

type Labels = [string, string, string, string, string];

/** As 5 carinhas do diário; no "como acordou", uma nota opcional por baixo. */
export function StepScale({
  name,
  title,
  help,
  labels,
  value,
  onChange,
  note,
}: {
  name: string;
  title: string;
  help: string;
  labels: Labels;
  value: number | null;
  onChange: (v: number) => void;
  note?: { label: string; placeholder: string; value: string; onChange: (v: string) => void; onBlur: () => void };
}) {
  return (
    <div className="mg-step mg-step-scale">
      <p className="mg-step__help">{help}</p>
      <MoodScale name={name} legend={title} labels={labels} value={value} onChange={onChange} />
      {note && (
        <label className="mg-step-scale__note">
          {note.label}
          <textarea className="mg-step-text__input" rows={2} maxLength={500} placeholder={note.placeholder} value={note.value} onChange={(e) => note.onChange(e.target.value)} onBlur={note.onBlur} />
        </label>
      )}
    </div>
  );
}
