import Link from 'next/link';
import type { DayProgress } from '@/lib/daily/progress';

interface DayProgressDotsProps {
  progress: DayProgress;
  /** Estado por extenso para leitores de ecrã. */
  label: string;
  /** Com `href` vira link para o dia. */
  href?: string;
  size?: 'sm' | 'md';
}

/** 3 pontos: manhã, corpo, noite. */
export function DayProgressDots({ progress, label, href, size = 'md' }: DayProgressDotsProps) {
  const className = size === 'sm' ? 'mg-progress-dots mg-progress-dots--sm' : 'mg-progress-dots';
  const dots = [progress.morning, progress.body, progress.night].map((done, i) => (
    <span
      key={i}
      className={done ? 'mg-progress-dots__dot mg-progress-dots__dot--done' : 'mg-progress-dots__dot'}
      aria-hidden="true"
    />
  ));

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label} title={label}>
        {dots}
      </Link>
    );
  }
  return (
    <span className={className} role="img" aria-label={label} title={label}>
      {dots}
    </span>
  );
}
