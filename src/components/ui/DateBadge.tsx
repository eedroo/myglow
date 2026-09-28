import { formatNumericDate, type DateISO } from '@/lib/dates';
import { MagicIcon } from './MagicIcon';

interface DateBadgeProps {
  date: DateISO;
  /** Data por extenso para leitores de ecrã. */
  label: string;
}

/** Ícone de calendário + dd / mm / aaaa. */
export function DateBadge({ date, label }: DateBadgeProps) {
  return (
    <span className="mg-date-badge">
      <MagicIcon name="calendar" size="sm" decorative />
      <time className="mg-date-badge__text" dateTime={date} aria-label={label}>
        {formatNumericDate(date)}
      </time>
    </span>
  );
}
