import type { ReactNode } from 'react';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';

/** Abertura do fluxo: saudação, data, lua (ou o período e a intenção anterior). Server. */
export function StepIntro({ icon, eyebrow, title, lines, cta }: { icon: MagicIconName; eyebrow: string; title: string; lines: ReactNode[]; cta: string }) {
  return (
    <div className="mg-step mg-step-intro">
      <span className="mg-step-intro__icon">
        <MagicIcon name={icon} size="xl" decorative />
      </span>
      <p className="mg-step__eyebrow">{eyebrow}</p>
      <h2 className="mg-step__title">{title}</h2>
      {lines.map((l, i) => (
        <p key={i} className="mg-step__help">
          {l}
        </p>
      ))}
      <p className="mg-step-intro__cta">{cta}</p>
    </div>
  );
}
