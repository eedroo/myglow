'use client';

import type { ProjectArea } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { PROJECT_ICONS } from '@/lib/icons';

interface ProjectIntentionCardProps {
  id: string;
  area: ProjectArea;
  rows?: number;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  /** Foco sugerido pela leitura da semana (F6). */
  note?: string;
}

export function ProjectIntentionCard({ id, area, rows = 3, value, onChange, onBlur, note }: ProjectIntentionCardProps) {
  const t = useTranslations('projects');
  const tr = useTranslations('reading');
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
        rows={rows}
        maxLength={500}
        value={value}
        placeholder={t('placeholder')}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {note && (
        <p className="mg-project__note">
          <MagicIcon name="sparkles" size="sm" decorative />
          <span>
            <span className="mg-visually-hidden">{tr('focus')}: </span>
            {note}
          </span>
        </p>
      )}
    </div>
  );
}
