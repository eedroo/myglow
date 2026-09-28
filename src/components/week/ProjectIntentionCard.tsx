'use client';

import type { ProjectArea } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';

export const PROJECT_ICONS: Record<ProjectArea, MagicIconName> = {
  MAGIC: 'cauldron',
  PERSONAL: 'heart',
  LEISURE: 'lotus',
  PROFESSIONAL: 'briefcase',
  STUDIES: 'book-open',
};

interface ProjectIntentionCardProps {
  area: ProjectArea;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function ProjectIntentionCard({ area, value, onChange, onBlur }: ProjectIntentionCardProps) {
  const t = useTranslations('projects');
  const id = `project-${area.toLowerCase()}`;
  return (
    <div className="mg-project">
      <label htmlFor={id} className="mg-project__head">
        <span className="mg-project__icon">
          <MagicIcon name={PROJECT_ICONS[area]} size="sm" decorative />
        </span>
        <span className="mg-project__label">{t(`areas.${area}`)}</span>
      </label>
      <LinedTextArea
        id={id}
        className="mg-project__text"
        rows={3}
        maxLength={500}
        value={value}
        placeholder={t('placeholder')}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}
