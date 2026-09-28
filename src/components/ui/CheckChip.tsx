'use client';

import { Check } from 'lucide-react';
import type { MagicIconName } from '@/lib/icons';
import { MagicIcon } from './MagicIcon';

interface CheckChipProps {
  icon: MagicIconName;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** Check pequeno inline com ícone (alongamento, treino, água). */
export function CheckChip({ icon, label, checked, onCheckedChange }: CheckChipProps) {
  return (
    <label className={checked ? 'mg-check-chip mg-check-chip--checked' : 'mg-check-chip'}>
      <input
        className="mg-check-chip__input"
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <MagicIcon name={icon} size="sm" decorative />
      <span className="mg-check-chip__label">{label}</span>
      <span className="mg-check-chip__box" aria-hidden="true">
        <Check size={12} strokeWidth={2.5} />
      </span>
    </label>
  );
}
