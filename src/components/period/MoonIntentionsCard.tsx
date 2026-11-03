'use client';

import { useTranslations } from 'next-intl';
import { GlassCard } from '@/components/ui/GlassCard';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';
import { MOON_FIELDS, type MoonField } from '@/types/planner';

const ICON: Record<MoonField, MagicIconName> = { moonNew: 'phase-new', moonWaxing: 'phase-first-quarter', moonFull: 'phase-full', moonWaning: 'phase-last-quarter' };

interface MoonIntentionsCardProps {
  values: Record<MoonField, string>;
  onChange: (field: MoonField, value: string) => void;
  onBlur: () => void;
}

/** Mês: a intenção para cada fase da lua (começar, fazer crescer, celebrar, soltar). */
export function MoonIntentionsCard({ values, onChange, onBlur }: MoonIntentionsCardProps) {
  const t = useTranslations('month.moon');
  return (
    <GlassCard>
      <section className="mg-projects mg-projects--compact" aria-labelledby="month-moon-title">
        <h2 id="month-moon-title" className="mg-projects__header">
          <MagicIcon name="moon-stars" size="sm" decorative />
          {t('title')}
        </h2>
        <div className="mg-projects__grid">
          {MOON_FIELDS.map((f) => (
            <div key={f} className="mg-project">
              <label htmlFor={`month-${f}`} className="mg-project__head">
                <span className="mg-project__icon">
                  <MagicIcon name={ICON[f]} size="sm" decorative />
                </span>
                <span className="mg-project__label">{t(`${f}.label`)}</span>
              </label>
              <LinedTextArea
                id={`month-${f}`}
                className="mg-project__text"
                rows={2}
                maxLength={1000}
                value={values[f]}
                placeholder={t(`${f}.placeholder`)}
                onChange={(e) => onChange(f, e.target.value)}
                onBlur={onBlur}
              />
            </div>
          ))}
        </div>
      </section>
    </GlassCard>
  );
}
