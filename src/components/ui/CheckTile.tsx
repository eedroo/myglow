'use client';

import { useId } from 'react';
import { Check } from 'lucide-react';
import type { MagicIconName } from '@/lib/icons';
import { MagicIcon } from './MagicIcon';

interface CheckTileProps {
  icon: MagicIconName;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Rótulo acessível do check (ex.: "Feito"). */
  checkLabel: string;
  /** Banimento: acrescenta um campo de texto (nome) antes do check. */
  withText?: boolean;
  text?: string;
  onTextChange?: (text: string) => void;
  textLabel?: string;
  textPlaceholder?: string;
}

export function CheckTile({
  icon,
  label,
  checked,
  onCheckedChange,
  checkLabel,
  withText,
  text = '',
  onTextChange,
  textLabel,
  textPlaceholder,
}: CheckTileProps) {
  const id = useId();
  return (
    <div className={checked ? 'mg-check-tile mg-check-tile--checked' : 'mg-check-tile'}>
      <span className="mg-check-tile__icon">
        <MagicIcon name={icon} size="md" decorative />
      </span>
      <div className="mg-check-tile__body">
        <span id={`${id}-label`} className="mg-check-tile__label">
          {label}
        </span>
        {withText && (
          <input
            className="mg-check-tile__text"
            type="text"
            value={text}
            placeholder={textPlaceholder}
            aria-label={textLabel ?? label}
            onChange={(e) => onTextChange?.(e.target.value)}
          />
        )}
      </div>
      <span className="mg-check-tile__check">
        <input
          className="mg-check-tile__input"
          type="checkbox"
          checked={checked}
          aria-labelledby={`${id}-label ${id}-check`}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        <span id={`${id}-check`} className="mg-visually-hidden">
          {checkLabel}
        </span>
        <Check size={18} strokeWidth={2} aria-hidden="true" />
      </span>
    </div>
  );
}
