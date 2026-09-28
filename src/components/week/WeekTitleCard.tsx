'use client';

import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';

interface WeekTitleCardProps {
  value: string;
  defaultTitle: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

/** Faixa com lua e sol e título editável (vazio = título por defeito). */
export function WeekTitleCard({ value, defaultTitle, onChange, onBlur }: WeekTitleCardProps) {
  const t = useTranslations('week');
  return (
    <div className="mg-week-title">
      <MagicIcon name="moon-crescent" size="md" decorative />
      <label htmlFor="week-title" className="mg-week-title__label">
        {t('titleLabel')}
      </label>
      <input
        id="week-title"
        className="mg-week-title__input"
        type="text"
        maxLength={80}
        value={value}
        placeholder={defaultTitle}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      <MagicIcon name="sun" size="md" decorative />
    </div>
  );
}
