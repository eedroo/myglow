'use client';

import { Check } from 'lucide-react';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';
import { Button } from '@/components/ui/Button';

const CHECKS: { field: 'stretchDone' | 'workoutDone' | 'waterDone'; icon: MagicIconName }[] = [
  { field: 'stretchDone', icon: 'stretch' },
  { field: 'workoutDone', icon: 'dumbbell' },
  { field: 'waterDone', icon: 'water-drop' },
];

/** Os 3 checks do corpo em grande; com body-pro, a entrada no Foco no corpo. */
export function StepBodyChecks({
  title,
  help,
  labels,
  values,
  onToggle,
  bodyPro,
  openBodyLabel,
  onOpenBody,
}: {
  title: string;
  help: string;
  labels: Record<'stretchDone' | 'workoutDone' | 'waterDone', string>;
  values: Record<string, unknown>;
  onToggle: (field: 'stretchDone' | 'workoutDone' | 'waterDone', v: boolean) => void;
  bodyPro: boolean;
  openBodyLabel: string;
  onOpenBody: () => void;
}) {
  return (
    <div className="mg-step mg-step-body">
      <h2 className="mg-step__title">{title}</h2>
      <p className="mg-step__help">{help}</p>
      <div className="mg-step-body__checks">
        {CHECKS.map(({ field, icon }) => {
          const on = values[field] === true;
          return (
            <button key={field} type="button" className={`mg-step-toggle mg-step-body__check${on ? ' mg-step-toggle--on' : ''}`} aria-pressed={on} onClick={() => onToggle(field, !on)}>
              <MagicIcon name={icon} size="md" decorative />
              {labels[field]}
              {on && <Check size={18} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {bodyPro && (
        <Button variant="subtle" onClick={onOpenBody}>
          {openBodyLabel}
        </Button>
      )}
    </div>
  );
}
