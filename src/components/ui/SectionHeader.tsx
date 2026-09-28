import type { MagicIconName } from '@/lib/icons';
import { MagicIcon } from './MagicIcon';

interface SectionHeaderProps {
  title: string;
  icon?: MagicIconName;
  as?: 'h2' | 'h3';
  className?: string;
}

/** Pílula dourada com gradiente ("MANHÃ", "NOITE"). */
export function SectionHeader({ title, icon, as: Tag = 'h2', className }: SectionHeaderProps) {
  return (
    <div className={className ? `mg-section-header ${className}` : 'mg-section-header'}>
      {icon && (
        <span className="mg-section-header__icon">
          <MagicIcon name={icon} size="sm" decorative />
        </span>
      )}
      <Tag className="mg-section-header__title">{title}</Tag>
    </div>
  );
}
