'use client';

import { useTranslations } from 'next-intl';
import { MagicIcon } from '@/components/ui/MagicIcon';

interface YearWordCardProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

/** Palavra do ano: input grande e centrado. */
export function YearWordCard({ value, onChange, onBlur }: YearWordCardProps) {
  const t = useTranslations('year.word');
  return (
    <section className="mg-year-word">
      <MagicIcon name="scroll" size="lg" decorative />
      <label htmlFor="year-word" className="mg-year-word__label">
        {t('label')}
      </label>
      <input
        id="year-word"
        className="mg-year-word__input"
        type="text"
        maxLength={40}
        autoComplete="off"
        value={value}
        placeholder={t('placeholder')}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </section>
  );
}
