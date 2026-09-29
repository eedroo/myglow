interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
}

/** Barra de progresso acessível (SVG, cores pelos tokens). */
export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <svg
      className="mg-progress"
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <rect className="mg-progress__track" x="0" y="0" width="100" height="8" rx="4" />
      {pct > 0 && <rect className="mg-progress__fill" x="0" y="0" width={pct} height="8" rx="4" />}
    </svg>
  );
}
