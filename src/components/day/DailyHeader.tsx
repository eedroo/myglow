import type { MoonPhase, ZodiacSign } from '@prisma/client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { MoonPhaseStrip } from '@/components/ui/MoonPhaseStrip';
import { ZodiacStrip } from '@/components/ui/ZodiacStrip';
import { DateBadge } from '@/components/ui/DateBadge';
import type { DateISO } from '@/lib/dates';

interface DailyHeaderProps {
  date: DateISO;
  dateLabel: string;
  phase: MoonPhase;
  moonSign: ZodiacSign;
  phaseLabels: Record<MoonPhase, string>;
  signLabels: Record<ZodiacSign, string>;
  phasesLabel: string;
  signsLabel: string;
  /** Chip "Semana {n} · {mês}" que liga à semana desse dia. */
  week?: { label: string; href: string };
  /** Nota do Glow (GlowWindowNote). */
  glowNote?: ReactNode;
}

/** Faixas de fases e signos (signo da lua) + data. */
export function DailyHeader(props: DailyHeaderProps) {
  return (
    <div className="mg-daily-header">
      <div className="mg-daily-header__strips">
        <MoonPhaseStrip phase={props.phase} labels={props.phaseLabels} label={props.phasesLabel} />
        <ZodiacStrip sign={props.moonSign} labels={props.signLabels} label={props.signsLabel} />
      </div>
      <div className="mg-daily-header__date">
        <DateBadge date={props.date} label={props.dateLabel} />
        {props.week && (
          <Link href={props.week.href} className="mg-daily-header__week">
            <MagicIcon name="calendar" size="sm" decorative />
            {props.week.label}
          </Link>
        )}
      </div>
      {props.glowNote && <div className="mg-daily-header__glow">{props.glowNote}</div>}
    </div>
  );
}
